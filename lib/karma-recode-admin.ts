import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export const KARMA_RECODE_PLAN_LABEL = "Karma Recode"

/**
 * Makes sure a Karma Recode buyer's Lifinity membership lasts as long as
 * their Karma Recode access.
 *
 *  - Already on a Karma Recode membership → its end date becomes `expiresAt`.
 *  - On another membership that already lasts at least as long → left alone.
 *  - Otherwise → that membership is retired (its Razorpay link stays on the
 *    old row, so a renewal can't overwrite this one) and a ₹0 Karma Recode
 *    membership ending `expiresAt` takes its place. One active membership
 *    per person is a database rule, hence retire-then-insert.
 */
export async function syncKarmaRecodeMembership(userId: string, expiresAt: string) {
  const admin = createAdminClient()
  const { data: active, error } = await admin
    .from("subscriptions")
    .select("id, plan_label, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
  if (error) throw new Error(error.message)

  const kr = (active ?? []).find((s) => (s.plan_label ?? "").startsWith("Karma Recode"))
  if (kr) {
    const { error: e } = await admin
      .from("subscriptions")
      .update({ expires_at: expiresAt, plan_label: KARMA_RECODE_PLAN_LABEL, plan_name: KARMA_RECODE_PLAN_LABEL })
      .eq("id", kr.id)
    if (e) throw new Error(e.message)
    return { action: "updated" as const, subscriptionId: kr.id as string }
  }

  const target = new Date(expiresAt).getTime()
  if ((active ?? []).some((s) => new Date(s.expires_at as string).getTime() >= target)) {
    return { action: "kept_longer_membership" as const }
  }

  if (active?.length) {
    const { error: e } = await admin.from("subscriptions").update({ status: "expired" }).eq("user_id", userId).eq("status", "active")
    if (e) throw new Error(e.message)
  }
  const { data: created, error: e } = await admin
    .from("subscriptions")
    .insert({
      user_id: userId,
      razorpay_payment_id: null,
      plan_name: KARMA_RECODE_PLAN_LABEL,
      plan_label: KARMA_RECODE_PLAN_LABEL,
      amount_paid: 0,
      tier: "membership",
      tier_rank: 1,
      status: "active",
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select("id")
    .single()
  if (e) throw new Error(e.message)
  return { action: "created" as const, subscriptionId: created.id as string, retired: (active ?? []).map((s) => s.id) }
}

/** Account id for an email, or null. Auth emails are matched case-insensitively. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient()
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    const hit = data.users.find((u) => u.email?.toLowerCase() === email)
    if (hit) return hit.id
    if (data.users.length < 1000) return null
  }
}
