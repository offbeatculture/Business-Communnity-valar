// One-click repairs from the Reconciliation page. Each one is a single,
// explicit change to one membership, and each is written to the admin audit
// trail with the before and after, so "why does this member run to March?"
// always has an answer.

import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAdminAction, requireAdmin } from "@/lib/admin-audit"
import { LIFETIME_EXPIRY, YEARLY_PRICES } from "@/lib/billing/reconcile"

const Fix = z.discriminatedUnion("action", [
  // Dates come from Postgres as "+00:00" and from JS as "Z"; accept both.
  z.object({
    action: z.literal("extend_expiry"),
    subscriptionId: z.string().uuid(),
    expiresAt: z.string().datetime({ offset: true }),
  }),
  z.object({
    action: z.literal("set_amount"),
    subscriptionId: z.string().uuid(),
    amountPaise: z.number().int().positive().max(10_000_000),
  }),
  z.object({ action: z.literal("set_tier"), subscriptionId: z.string().uuid() }),
  z.object({
    action: z.literal("link_payment"),
    subscriptionId: z.string().uuid(),
    paymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/).optional(),
    rzpSubscriptionId: z.string().regex(/^sub_[A-Za-z0-9]+$/).optional(),
  }),
  z.object({ action: z.literal("mark_expired"), subscriptionId: z.string().uuid() }),
  z.object({
    action: z.literal("grant_complimentary"),
    userId: z.string().uuid(),
    planLabel: z.enum(["Staff (complimentary)"]),
  }),
])

const SUB_COLUMNS =
  "id, user_id, plan_label, tier, amount_paid, locked_price_paise, status, starts_at, expires_at, razorpay_subscription_id, razorpay_payment_id"

function labelForAmount(paise: number) {
  if (YEARLY_PRICES.has(paise)) return "Lifinity Yearly Membership"
  if (paise === 149900) return "Lifinity Monthly Membership"
  return "Lifinity Membership"
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = Fix.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fix", details: parsed.error.issues }, { status: 400 })
  }
  const fix = parsed.data
  const admin = createAdminClient()

  // ── Complimentary lifetime membership (staff / Karma Recode) ────────────
  if (fix.action === "grant_complimentary") {
    // The database allows one active membership per person, so retire the
    // current one first. Its Razorpay link is kept on the retired row, which
    // means a renewal can never overwrite the lifetime one.
    const { data: before } = await admin
      .from("subscriptions")
      .select(SUB_COLUMNS)
      .eq("user_id", fix.userId)
      .eq("status", "active")

    const { error: retireError } = await admin
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("user_id", fix.userId)
      .eq("status", "active")
    if (retireError) return NextResponse.json({ error: retireError.message }, { status: 500 })

    const { data: created, error } = await admin
      .from("subscriptions")
      .insert({
        user_id: fix.userId,
        razorpay_payment_id: null,
        plan_name: fix.planLabel,
        plan_label: fix.planLabel,
        amount_paid: 0,
        tier: "membership",
        tier_rank: 1,
        status: "active",
        starts_at: new Date().toISOString(),
        expires_at: LIFETIME_EXPIRY,
      })
      .select(SUB_COLUMNS)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAdminAction({
      adminUserId: auth.userId,
      adminEmail: auth.email,
      targetUserId: fix.userId,
      action: "billing_grant_complimentary",
      detail: { planLabel: fix.planLabel, retired: before ?? [], created },
    })
    return NextResponse.json({ ok: true, subscription: created })
  }

  // ── Everything else changes one existing membership ─────────────────────
  const { data: before, error: readError } = await admin
    .from("subscriptions")
    .select(SUB_COLUMNS)
    .eq("id", fix.subscriptionId)
    .maybeSingle()
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
  if (!before) return NextResponse.json({ error: "Membership not found" }, { status: 404 })

  let update: Record<string, unknown>
  switch (fix.action) {
    case "extend_expiry":
      update = {
        expires_at: fix.expiresAt,
        status: new Date(fix.expiresAt).getTime() > Date.now() ? "active" : before.status,
      }
      break
    case "set_amount": {
      const yearly = YEARLY_PRICES.has(fix.amountPaise)
      update = {
        amount_paid: fix.amountPaise,
        locked_price_paise: fix.amountPaise,
        plan_label: labelForAmount(fix.amountPaise),
      }
      // A yearly payment buys a year from when the membership started.
      if (yearly && before.starts_at) {
        const yearEnd = new Date(before.starts_at)
        yearEnd.setFullYear(yearEnd.getFullYear() + 1)
        if (!before.expires_at || new Date(before.expires_at) < yearEnd) {
          update.expires_at = yearEnd.toISOString()
          if (yearEnd.getTime() > Date.now()) update.status = "active"
        }
      }
      break
    }
    case "set_tier":
      update = { tier: "membership", tier_rank: 1 }
      break
    case "link_payment":
      if (!fix.paymentId && !fix.rzpSubscriptionId) {
        return NextResponse.json({ error: "Nothing to link" }, { status: 400 })
      }
      update = {
        ...(fix.paymentId ? { razorpay_payment_id: fix.paymentId } : {}),
        ...(fix.rzpSubscriptionId ? { razorpay_subscription_id: fix.rzpSubscriptionId } : {}),
      }
      break
    case "mark_expired":
      update = { status: "expired" }
      break
  }

  const { data: after, error } = await admin
    .from("subscriptions")
    .update(update)
    .eq("id", fix.subscriptionId)
    .select(SUB_COLUMNS)
    .single()

  if (error) {
    // 23505: the one-active-membership-per-person rule, or a payment already
    // linked to someone else. Say which, rather than "failed".
    const message =
      error.code === "23505"
        ? "That would give this person two active memberships, or link a payment that's already linked to someone else."
        : error.message
    return NextResponse.json({ error: message }, { status: 409 })
  }

  await logAdminAction({
    adminUserId: auth.userId,
    adminEmail: auth.email,
    targetUserId: before.user_id,
    action: `billing_${fix.action}`,
    detail: { before, after, request: fix },
  })

  return NextResponse.json({ ok: true, subscription: after })
}
