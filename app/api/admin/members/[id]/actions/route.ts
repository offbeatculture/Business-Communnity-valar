import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin, logAdminAction } from "@/lib/admin-audit"
import { createMagicLoginToken } from "@/lib/magic-link"
import { sendMagicLinkEmail } from "@/lib/ses"
import { SINGLE_PLAN } from "@/lib/plans"

/**
 * Statuses that block access even with a future expiry date. Extending
 * `expires_at` while one of these is set would look like it worked and
 * change nothing, so an extend clears it back to null.
 */
const BLOCKING_RECURRING = new Set(["expired", "halted", "completed"])

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("extend_subscription"),
    days: z.number().int().min(1).max(3650).optional(),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("revoke_access"),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("resend_login"),
    note: z.string().max(500).optional(),
  }),
])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: profileId } = await params

    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from("profiles")
      .select("id, user_id, full_name")
      .eq("id", profileId)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const userId = profile.user_id as string
    const { action } = parsed.data

    // ── Extend ────────────────────────────────────────────────
    if (action === "extend_subscription") {
      const { days, until, note } = parsed.data

      if (!days && !until) {
        return NextResponse.json(
          { error: "Provide either days or an until date" },
          { status: 400 },
        )
      }

      const { data: current } = await admin
        .from("subscriptions")
        .select("id, expires_at, recurring_status")
        .eq("user_id", userId)
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      // Extend from whichever is later: today, or the existing expiry.
      // Extending from an expiry already in the past would silently give
      // fewer days than the admin asked for.
      const base =
        current?.expires_at && new Date(current.expires_at) > new Date()
          ? new Date(current.expires_at)
          : new Date()

      const newExpiry = until
        ? new Date(`${until}T23:59:59.000Z`)
        : new Date(base.getTime() + (days ?? 0) * 86_400_000)

      const clearsBlock =
        current?.recurring_status &&
        BLOCKING_RECURRING.has(current.recurring_status as string)

      if (current) {
        await admin
          .from("subscriptions")
          .update({
            expires_at: newExpiry.toISOString(),
            status: "active",
            ...(clearsBlock ? { recurring_status: null } : {}),
          })
          .eq("id", current.id)
      } else {
        // No subscription row at all — a manually granted member.
        await admin.from("subscriptions").insert({
          user_id: userId,
          plan_name: SINGLE_PLAN.name,
          amount_paid: 0,
          status: "active",
          starts_at: new Date().toISOString(),
          expires_at: newExpiry.toISOString(),
        })
      }

      await logAdminAction({
        adminUserId: auth.userId,
        adminEmail: auth.email,
        targetUserId: userId,
        targetProfileId: profileId,
        action: "extend_subscription",
        detail: {
          days: days ?? null,
          until: until ?? null,
          previous_expiry: current?.expires_at ?? null,
          new_expiry: newExpiry.toISOString(),
          cleared_recurring_status: clearsBlock ?? false,
        },
        note: note ?? null,
      })

      return NextResponse.json({
        message: `Access extended to ${newExpiry.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
        expires_at: newExpiry.toISOString(),
      })
    }

    // ── Revoke ────────────────────────────────────────────────
    if (action === "revoke_access") {
      const { note } = parsed.data

      const { data: current } = await admin
        .from("subscriptions")
        .select("id, expires_at")
        .eq("user_id", userId)
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!current) {
        return NextResponse.json(
          { error: "This member has no subscription to revoke" },
          { status: 400 },
        )
      }

      await admin
        .from("subscriptions")
        .update({
          status: "cancelled",
          expires_at: new Date().toISOString(),
        })
        .eq("id", current.id)

      await logAdminAction({
        adminUserId: auth.userId,
        adminEmail: auth.email,
        targetUserId: userId,
        targetProfileId: profileId,
        action: "revoke_access",
        detail: { previous_expiry: current.expires_at },
        note: note ?? null,
      })

      return NextResponse.json({ message: "Access revoked" })
    }

    // ── Resend login ──────────────────────────────────────────
    const { note } = parsed.data

    const { data: emailRow } = await admin.rpc("get_emails_by_user_ids", {
      p_ids: [userId],
    })

    const email = Array.isArray(emailRow) ? emailRow[0]?.email : null
    if (!email) {
      return NextResponse.json(
        { error: "No email address on file for this member" },
        { status: 400 },
      )
    }

    // This app's createMagicLoginToken takes the user id, not the email
    // (EIC's takes an email) — and sendMagicLinkEmail takes an object.
    const token = await createMagicLoginToken(userId)
    await sendMagicLinkEmail({
      to: email,
      name: profile.full_name ?? undefined,
      token,
    })

    await logAdminAction({
      adminUserId: auth.userId,
      adminEmail: auth.email,
      targetUserId: userId,
      targetProfileId: profileId,
      action: "resend_login",
      detail: { email },
      note: note ?? null,
    })

    return NextResponse.json({ message: `Login link sent to ${email}` })
  } catch (error) {
    console.error("POST /api/admin/members/[id]/actions error:", error)
    return NextResponse.json({ error: "Action failed" }, { status: 500 })
  }
}
