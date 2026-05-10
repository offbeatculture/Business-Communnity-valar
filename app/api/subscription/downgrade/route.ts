// ============================================================
// POST /api/subscription/downgrade
//
// Phase 5 / Decision D2 — end-of-period downgrade.
//
// Flow:
//   1. requireActiveSubscription
//   2. Validate body { to_tier }
//   3. Read current active subscription
//   4. Require to_tier rank STRICTLY lower than current — else 400
//   5. D5 check: no other tier_change rows in the current billing period
//   6. Reject legacy one-time-payment subscriptions (no Razorpay sub bound)
//   7. schedulePendingDowngrade — writes pending_downgrade_to /
//      pending_downgrade_effective_at on the subscription row
//   8. razorpayCancelAtCycleEnd — tells Razorpay to stop billing at cycle end
//   9. recordTierChange with change_type='downgrade',
//      effective_at = subscription.expires_at, pro_rated_paise = null
//  10. Return { success, effectiveAt, currentTier, scheduledTier }
//
// The actual tier flip (cancel old plan, create new sub on lower-tier plan)
// happens in the webhook when Razorpay reports the cycle ended — that lives
// in app/api/webhooks/razorpay/route.ts and is owned by Phase 5B.
// ============================================================

import { NextResponse } from "next/server"
import { z } from "zod/v4"
import {
  requireActiveSubscription,
  TierAccessError,
} from "@/lib/auth/tier"
import { createClient } from "@/lib/supabase/server"
import { getTierRank, type ProductTier } from "@/lib/plans"
import {
  getActiveSubscriptionForUser,
  hasRecentTierChange,
  razorpayCancelAtCycleEnd,
  recordTierChange,
  schedulePendingDowngrade,
  TierChangeError,
} from "@/lib/subscription/tier-change"

const DowngradeRequestSchema = z.object({
  to_tier: z.enum(["library", "workshop", "ai_lab"]),
})

export async function POST(request: Request) {
  try {
    // 1. Auth + active subscription required.
    const state = await requireActiveSubscription()

    // 2. Validate body.
    const body = await request.json().catch(() => null)
    const parsed = DowngradeRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body — expected { to_tier }" },
        { status: 400 },
      )
    }
    const toTier: ProductTier = parsed.data.to_tier

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 3. Current active subscription.
    const currentSub = await getActiveSubscriptionForUser(supabase, user.id)

    // 4. Strictly lower tier required.
    if (getTierRank(toTier) >= getTierRank(currentSub.tier)) {
      return NextResponse.json(
        {
          error:
            "Target tier must be strictly lower than current tier — use /api/subscription/upgrade instead.",
          currentTier: currentSub.tier,
          requestedTier: toTier,
        },
        { status: 400 },
      )
    }

    // 5. D5 frequency lock.
    const already = await hasRecentTierChange(
      supabase,
      user.id,
      currentSub.starts_at,
    )
    if (already) {
      return NextResponse.json(
        {
          error: `You already changed tier this billing period. Next change available after ${currentSub.expires_at}.`,
          nextChangeAvailableAt: currentSub.expires_at,
        },
        { status: 409 },
      )
    }

    // 6. Legacy one-time-payment subscriptions cannot be downgraded.
    if (!currentSub.razorpay_subscription_id) {
      return NextResponse.json(
        {
          error:
            "Legacy one-time-payment subscriptions cannot be downgraded — cancel and resubscribe at the new tier.",
          code: "legacy_subscription_uncancellable",
        },
        { status: 400 },
      )
    }

    // 7. Write pending_downgrade_* columns on the subscription row.
    const scheduled = await schedulePendingDowngrade(supabase, {
      subscriptionId: currentSub.id,
      toTier,
    })

    // 8. Tell Razorpay to stop billing at cycle end. If this fails we surface
    //    the error to the user — better than silently swallowing it, since
    //    leaving the Razorpay subscription billing past cycle end would
    //    charge the user for the OLD tier after they think they downgraded.
    //
    //    TODO: if Razorpay cancel fails, the DB is now in a half-state
    //    (pending_downgrade_* set, but Razorpay will still bill). A follow-up
    //    job (Phase 5B) should reconcile by retrying the Razorpay cancel
    //    OR rolling back the pending_downgrade fields. For now we surface
    //    the error so the user can retry.
    try {
      await razorpayCancelAtCycleEnd(currentSub.razorpay_subscription_id)
    } catch (err) {
      console.error(
        "[POST /api/subscription/downgrade] razorpayCancelAtCycleEnd failed",
        err,
      )
      if (err instanceof TierChangeError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: err.status },
        )
      }
      return NextResponse.json(
        {
          error: `Razorpay cancel-at-cycle-end failed: ${
            err instanceof Error ? err.message : String(err)
          }. The downgrade is partially scheduled — please retry.`,
          code: "razorpay_cancel_failed",
        },
        { status: 502 },
      )
    }

    // 9. Audit row. effective_at = end of current period (D2).
    await recordTierChange(supabase, {
      userId: user.id,
      subscriptionId: currentSub.id,
      fromTier: currentSub.tier,
      toTier,
      changeType: "downgrade",
      effectiveAt: new Date(scheduled.effective_at),
      proRatedPaise: null,
    })

    return NextResponse.json({
      success: true,
      effectiveAt: scheduled.effective_at,
      currentTier: state.tier,
      scheduledTier: toTier,
    })
  } catch (err) {
    if (err instanceof TierAccessError) return err.response
    if (err instanceof TierChangeError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      )
    }
    console.error("[POST /api/subscription/downgrade] unexpected error:", err)
    return NextResponse.json(
      { error: "Failed to schedule downgrade" },
      { status: 500 },
    )
  }
}
