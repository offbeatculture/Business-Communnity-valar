// ============================================================
// Tier change orchestration — Phase 5 of three-tier system.
//
// Spec: Three-tier-implementation-plan.md
//   D1 — Upgrade timing: pro-rate immediately
//   D2 — Downgrade timing: end-of-period (scheduled, fires on webhook)
//   D5 — One tier change per billing period
//
// This module is the single source of truth for:
//   - reading the caller's active subscription (with all tier metadata)
//   - computing pro-rate paise for an immediate upgrade (D1)
//   - enforcing the once-per-period frequency lock (D5)
//   - recording a tier_changes audit row
//   - scheduling a pending downgrade (D2)
//   - cancelling Razorpay subscriptions (at-cycle-end OR immediate)
//   - executing the actual upgrade switch (cancel old + insert new sub row)
//
// Server-only — never import into client code.
// ============================================================

import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getTierBand,
  getTierRank,
  type ProductTier,
} from "@/lib/plans"
import { razorpay } from "@/lib/razorpay"
import {
  createSubscription,
  getRazorpayPlanIdForTier,
} from "@/lib/razorpay-subscriptions"

// ── Types ──

export type TierChangeType = "upgrade" | "downgrade" | "reactivation"

export type ActiveSubscription = {
  id: string
  user_id: string
  tier: ProductTier
  tier_rank: 1 | 2 | 3
  locked_price_paise: number
  band_at_signup: string
  razorpay_subscription_id: string | null
  razorpay_plan_id: string | null
  starts_at: string
  expires_at: string
  pending_downgrade_to: ProductTier | null
  pending_downgrade_effective_at: string | null
}

// Custom error class so callers can produce the right HTTP status code.
// Defaulting to 400 keeps fallback behaviour useful even if the caller
// forgets to check.
export class TierChangeError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, opts: { status?: number; code?: string } = {}) {
    super(message)
    this.name = "TierChangeError"
    this.status = opts.status ?? 400
    this.code = opts.code ?? "tier_change_error"
  }
}

// ── 1. Read the caller's active subscription ──

/**
 * Throws TierChangeError(404) if no active sub exists for `userId`.
 *
 * Selects every column needed by every Phase 5 flow: the upgrade flow needs
 * `locked_price_paise + starts_at + expires_at` for pro-rate math, the
 * downgrade flow needs `razorpay_subscription_id + expires_at` for scheduling,
 * and the pending-downgrade columns are surfaced for UI display by callers
 * that want to show "you already scheduled a downgrade".
 */
export async function getActiveSubscriptionForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveSubscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, user_id, tier, tier_rank, locked_price_paise, band_at_signup, razorpay_subscription_id, razorpay_plan_id, starts_at, expires_at, pending_downgrade_to, pending_downgrade_effective_at",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle<Record<string, unknown>>()

  if (error) {
    throw new TierChangeError(
      `Failed to read subscription: ${error.message}`,
      { status: 500, code: "subscription_read_failed" },
    )
  }

  if (!data) {
    throw new TierChangeError("No active subscription found", {
      status: 404,
      code: "no_active_subscription",
    })
  }

  // Defensive narrowing — DB CHECK constraints guarantee these are valid,
  // but the JS client surfaces them as `string`/`number`.
  return {
    id: data.id as string,
    user_id: data.user_id as string,
    tier: data.tier as ProductTier,
    tier_rank: data.tier_rank as 1 | 2 | 3,
    locked_price_paise: (data.locked_price_paise as number) ?? 0,
    band_at_signup: (data.band_at_signup as string) ?? "founding",
    razorpay_subscription_id:
      (data.razorpay_subscription_id as string | null) ?? null,
    razorpay_plan_id: (data.razorpay_plan_id as string | null) ?? null,
    starts_at: data.starts_at as string,
    expires_at: data.expires_at as string,
    pending_downgrade_to:
      (data.pending_downgrade_to as ProductTier | null) ?? null,
    pending_downgrade_effective_at:
      (data.pending_downgrade_effective_at as string | null) ?? null,
  }
}

// ── 2. Compute the pro-rate (D1) ──

/**
 * Pro-rate formula for an immediate upgrade:
 *
 *   amount_owed = (new_monthly - current_locked) * (days_remaining / total_days_in_period)
 *
 * - days_remaining = max(0, ceil((expires_at - now) / 1 day))
 * - total_days_in_period = ceil((expires_at - starts_at) / 1 day); typically 30
 *
 * Rounded to integer paise. Minimum 100 paise (₹1) so Razorpay does not
 * reject the order — Razorpay has a minimum order amount well above zero.
 *
 * Returns 100 paise (the floor) if the upgrade is "free or negative" — this
 * shouldn't happen in practice (caller already validated new tier rank is
 * higher, and higher tier ⇒ higher monthly), but we floor defensively.
 */
export function computeProratePaise(args: {
  currentLockedPaise: number
  newMonthlyPaise: number
  startsAt: string
  expiresAt: string
  now: Date
}): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const MIN_PAISE = 100

  const startsAt = new Date(args.startsAt).getTime()
  const expiresAt = new Date(args.expiresAt).getTime()
  const now = args.now.getTime()

  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAt - now) / MS_PER_DAY),
  )
  const totalDays = Math.max(
    1, // never divide by zero, even on malformed input
    Math.ceil((expiresAt - startsAt) / MS_PER_DAY),
  )

  const diff = args.newMonthlyPaise - args.currentLockedPaise
  if (diff <= 0) return MIN_PAISE

  const raw = diff * (daysRemaining / totalDays)
  const rounded = Math.round(raw)
  return Math.max(MIN_PAISE, rounded)
}

// ── 3. D5 frequency check ──

/**
 * Returns true if there is any tier_change row for `userId` whose
 * `requested_at >= billingStart`. Callers should use the current
 * subscription's `starts_at` as `billingStart`.
 */
export async function hasRecentTierChange(
  supabase: SupabaseClient,
  userId: string,
  billingStart: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("tier_changes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("requested_at", billingStart)

  if (error) {
    throw new TierChangeError(
      `Failed to query tier_changes: ${error.message}`,
      { status: 500, code: "tier_changes_read_failed" },
    )
  }
  return (count ?? 0) > 0
}

// ── 4. Record audit row ──

/**
 * effective_at semantics:
 *   upgrade      -> now (the immediate switch already happened)
 *   downgrade    -> end of current billing period (subscription.expires_at)
 *   reactivation -> now
 *
 * Returns the inserted row id. Throws TierChangeError on insert failure.
 */
export async function recordTierChange(
  supabase: SupabaseClient,
  args: {
    userId: string
    subscriptionId: string
    fromTier: ProductTier
    toTier: ProductTier
    changeType: TierChangeType
    effectiveAt: Date
    proRatedPaise: number | null
  },
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("tier_changes")
    .insert({
      user_id: args.userId,
      subscription_id: args.subscriptionId,
      from_tier: args.fromTier,
      to_tier: args.toTier,
      change_type: args.changeType,
      effective_at: args.effectiveAt.toISOString(),
      pro_rated_paise: args.proRatedPaise,
    })
    .select("id")
    .single()

  if (error || !data) {
    throw new TierChangeError(
      `Failed to insert tier_changes row: ${error?.message ?? "unknown"}`,
      { status: 500, code: "tier_change_insert_failed" },
    )
  }

  return { id: data.id as string }
}

// ── 5. Schedule pending downgrade (D2) ──

/**
 * Marks the current subscription as scheduled to downgrade at end of period.
 * Does NOT modify `tier`, `tier_rank`, or `locked_price_paise` — those flip
 * when the renewal webhook fires (Phase 5B owns the webhook side).
 *
 * `pending_downgrade_effective_at` is set to the subscription's current
 * `expires_at`. We re-read the row to use whatever the DB has (defensive
 * against caller passing a stale value).
 */
export async function schedulePendingDowngrade(
  supabase: SupabaseClient,
  args: { subscriptionId: string; toTier: ProductTier },
): Promise<{ effective_at: string }> {
  const { data: current, error: readErr } = await supabase
    .from("subscriptions")
    .select("expires_at")
    .eq("id", args.subscriptionId)
    .single()

  if (readErr || !current) {
    throw new TierChangeError(
      `Failed to read subscription for downgrade: ${readErr?.message ?? "not found"}`,
      { status: 404, code: "subscription_not_found" },
    )
  }

  const effectiveAt = current.expires_at as string

  const { error: updateErr } = await supabase
    .from("subscriptions")
    .update({
      pending_downgrade_to: args.toTier,
      pending_downgrade_effective_at: effectiveAt,
    })
    .eq("id", args.subscriptionId)

  if (updateErr) {
    throw new TierChangeError(
      `Failed to schedule downgrade: ${updateErr.message}`,
      { status: 500, code: "downgrade_schedule_failed" },
    )
  }

  return { effective_at: effectiveAt }
}

// ── 6. Razorpay cancel-at-cycle-end ──

/**
 * Cancels the Razorpay subscription at the END of the current cycle.
 * Razorpay continues to honour access until cycle end; no more renewals.
 *
 * Throws if `razorpayId` is empty/null — legacy one-time-payment rows have
 * no Razorpay subscription to cancel.
 */
export async function razorpayCancelAtCycleEnd(
  razorpayId: string,
): Promise<unknown> {
  if (!razorpayId) {
    throw new TierChangeError(
      "Cannot cancel legacy subscription via this flow — no Razorpay subscription ID is bound to this row",
      { status: 400, code: "legacy_subscription_uncancellable" },
    )
  }
  // Razorpay SDK: cancel(subscriptionId, cancelAtCycleEnd: boolean)
  return razorpay.subscriptions.cancel(razorpayId, true)
}

// ── 7. Execute the immediate upgrade switch ──

/**
 * Atomically (best-effort, no Supabase transaction available) swaps the
 * user from their old tier to a new tier:
 *
 *   1. Cancel the old Razorpay subscription IMMEDIATELY (not at cycle end).
 *   2. Mark the old `subscriptions` row as status='cancelled' so the
 *      partial-unique-index `idx_one_active_sub_per_user` frees up.
 *   3. Create a fresh Razorpay subscription on the new tier's plan ID.
 *   4. INSERT a new `subscriptions` row for the new tier, priced at the
 *      band currently selling for that tier.
 *
 * NOTE on transactions: Supabase JS does not expose multi-statement
 * transactions. The order above minimises the failure surface — by the
 * time we INSERT the new row, the unique-index slot is already free.
 * If the new INSERT fails AFTER the new Razorpay subscription was
 * created, we attempt to restore the OLD row to status='active' as a
 * best-effort recovery and log loudly. The user has paid pro-rate at this
 * point (verified upstream), so this code MUST succeed in the happy path.
 *
 * Returns `{ newSubscriptionId, razorpaySubscriptionId }`.
 */
export async function applyUpgradeImmediate(
  supabase: SupabaseClient,
  args: {
    userId: string
    oldSubscription: ActiveSubscription
    newTier: ProductTier
    userEmail: string
  },
): Promise<{ newSubscriptionId: string; razorpaySubscriptionId: string }> {
  const { userId, oldSubscription, newTier, userEmail } = args

  // 1. Cancel the old Razorpay subscription IMMEDIATELY (not at cycle end).
  //    The user is upgrading right now; we do not want Razorpay to keep
  //    billing the old plan for another cycle.
  if (oldSubscription.razorpay_subscription_id) {
    try {
      await razorpay.subscriptions.cancel(
        oldSubscription.razorpay_subscription_id,
        false, // cancelAtCycleEnd=false → cancel right now
      )
    } catch (err) {
      // Treat a Razorpay cancel failure as fatal — we do not want two
      // active Razorpay subscriptions for one user.
      throw new TierChangeError(
        `Failed to cancel old Razorpay subscription: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { status: 502, code: "razorpay_cancel_failed" },
      )
    }
  }

  // 2. Mark the old subscriptions row as cancelled so the partial-unique
  //    index frees up before we INSERT the new row.
  const { error: cancelOldErr } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", recurring_status: "cancelled" })
    .eq("id", oldSubscription.id)

  if (cancelOldErr) {
    throw new TierChangeError(
      `Failed to mark old subscription cancelled: ${cancelOldErr.message}`,
      { status: 500, code: "subscription_cancel_failed" },
    )
  }

  // 3. Determine the locked price for the new tier from the currently
  //    selling band. We use the active count AFTER the old row was
  //    cancelled (i.e. now) — this keeps the band derivation consistent
  //    with what a brand-new joiner would see right now.
  const { count: activeCount } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())

  const band = getTierBand(newTier, activeCount ?? 0)
  const newLockedPaise = band.monthlyPaise

  // 4. Create a fresh Razorpay subscription on the new tier's plan.
  let newRazorpaySubId: string
  let newRazorpayPlanId: string
  try {
    const created = await createSubscription({
      email: userEmail,
      sessionId: `tier_upgrade:${oldSubscription.id}`,
      tier: newTier,
    })
    newRazorpaySubId = created.subscription.id
    newRazorpayPlanId = created.planId
  } catch (err) {
    // Old row is already cancelled; attempt best-effort recovery so the
    // user is not left without an active subscription.
    console.error(
      "[applyUpgradeImmediate] createSubscription failed AFTER old row was cancelled — attempting recovery",
      err,
    )
    await supabase
      .from("subscriptions")
      .update({ status: "active", recurring_status: "active" })
      .eq("id", oldSubscription.id)
      .then(({ error: restoreErr }) => {
        if (restoreErr) {
          console.error(
            "[applyUpgradeImmediate] RECOVERY FAILED — user has no active subscription",
            { userId, oldSubscriptionId: oldSubscription.id, restoreErr },
          )
        }
      })
    throw new TierChangeError(
      `Failed to create new Razorpay subscription: ${
        err instanceof Error ? err.message : String(err)
      }`,
      { status: 502, code: "razorpay_create_failed" },
    )
  }

  // 5. Insert the new subscriptions row. Mirrors the shape used by
  //    handleSubscriptionActivated in app/api/webhooks/razorpay/route.ts.
  const startsAt = new Date()
  const expiresAt = new Date(startsAt)
  expiresAt.setDate(expiresAt.getDate() + 30)

  const { data: newSub, error: insertErr } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      razorpay_subscription_id: newRazorpaySubId,
      razorpay_plan_id: newRazorpayPlanId,
      plan_name: `${newTier}_monthly`,
      plan_label: `${band.tierLabel} — Monthly`,
      base_amount_paise: newLockedPaise,
      amount_paid: newLockedPaise,
      currency: "INR",
      status: "active",
      recurring_status: "active",
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      tier: newTier,
      tier_rank: getTierRank(newTier),
      locked_price_paise: newLockedPaise,
      band_at_signup: band.band,
    })
    .select("id")
    .single()

  if (insertErr || !newSub) {
    // Best-effort recovery: restore the old row to active so the user has
    // SOMETHING. The new Razorpay sub is orphaned — we log so ops can clean
    // it up manually.
    console.error(
      "[applyUpgradeImmediate] new subscriptions INSERT failed — attempting recovery",
      {
        userId,
        orphanedRazorpaySubscriptionId: newRazorpaySubId,
        insertErr,
      },
    )
    await supabase
      .from("subscriptions")
      .update({ status: "active", recurring_status: "active" })
      .eq("id", oldSubscription.id)
      .then(({ error: restoreErr }) => {
        if (restoreErr) {
          console.error(
            "[applyUpgradeImmediate] RECOVERY FAILED — user has no active subscription",
            { userId, restoreErr },
          )
        }
      })
    throw new TierChangeError(
      `Failed to insert new subscription row: ${insertErr?.message ?? "unknown"}`,
      { status: 500, code: "subscription_insert_failed" },
    )
  }

  return {
    newSubscriptionId: newSub.id as string,
    razorpaySubscriptionId: newRazorpaySubId,
  }
}

// Re-export the env var resolver so callers that only import from this
// module don't have to also reach into lib/razorpay-subscriptions.
export { getRazorpayPlanIdForTier }
