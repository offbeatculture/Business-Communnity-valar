// ============================================================
// POST /api/subscription/upgrade
//
// Phase 5 / Decision D1 — pro-rate immediately.
//
// Flow:
//   1. requireActiveSubscription (401 / 403 if missing)
//   2. Validate body { to_tier }
//   3. Read caller's current active subscription
//   4. Require to_tier rank STRICTLY higher than current — otherwise 400
//   5. D5 check: no other tier_change rows in the current billing period
//   6. Compute pro-rate paise using lib/subscription/tier-change.computeProratePaise
//   7. Create a Razorpay ORDER (one-time) for the pro-rate amount
//   8. Return the order shape the client needs to open Razorpay checkout
//
// The actual switch (cancel old / create new subscription / write audit row)
// happens in POST /api/subscription/upgrade/verify after Razorpay returns
// a payment_id + signature.
// ============================================================

import { NextResponse } from "next/server"
import { z } from "zod/v4"
import {
  requireActiveSubscription,
  TierAccessError,
} from "@/lib/auth/tier"
import { createClient } from "@/lib/supabase/server"
import { razorpay } from "@/lib/razorpay"
import {
  calculateGST,
  getTierBand,
  getTierRank,
  type ProductTier,
} from "@/lib/plans"
import {
  computeProratePaise,
  getActiveSubscriptionForUser,
  hasRecentTierChange,
  TierChangeError,
} from "@/lib/subscription/tier-change"

const UpgradeRequestSchema = z.object({
  to_tier: z.enum(["library", "workshop", "ai_lab"]),
})

export async function POST(request: Request) {
  try {
    // 1. Auth + active subscription required.
    const state = await requireActiveSubscription()

    // 2. Validate body.
    const body = await request.json().catch(() => null)
    const parsed = UpgradeRequestSchema.safeParse(body)
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
      // requireActiveSubscription would have thrown — defensive.
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 3. Read current active subscription.
    const currentSub = await getActiveSubscriptionForUser(supabase, user.id)

    // 4. Require strictly higher tier.
    if (getTierRank(toTier) <= getTierRank(currentSub.tier)) {
      return NextResponse.json(
        {
          error:
            "Target tier must be strictly higher than current tier — use /api/subscription/downgrade instead.",
          currentTier: currentSub.tier,
          requestedTier: toTier,
        },
        { status: 400 },
      )
    }

    // 5. D5 frequency check. Billing window = current subscription period.
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

    // 6. Determine new monthly price from currently-selling band.
    const { count: activeCount } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())

    const newBand = getTierBand(toTier, activeCount ?? 0)
    const newMonthlyPaise = newBand.monthlyPaise

    // 7. Pro-rate calculation. `proRatePaise` is the BASE (pre-GST) amount —
    //    the analytics-friendly value we record in the tier_changes audit row
    //    via `base_amount` in order notes.
    const proRatePaise = computeProratePaise({
      currentLockedPaise: currentSub.locked_price_paise,
      newMonthlyPaise,
      startsAt: currentSub.starts_at,
      expiresAt: currentSub.expires_at,
      now: new Date(),
    })

    // Apply 18% GST (CGST 9% + SGST 9%) on top of the base pro-rate, mirroring
    // /api/razorpay/create-order. The user pays GST-inclusive paise; the verify
    // route still records the pre-GST base in `pro_rated_paise` for analytics.
    const gst = calculateGST(proRatePaise)
    const amountPaise = gst.total

    // 8. Create Razorpay ORDER (one-time charge for the GST-inclusive pro-rate).
    //    `base_amount` in notes stays pre-GST (audit + analytics);
    //    `gst_amount` records the tax portion so the webhook/verify route can
    //    reconcile if needed.
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `tier_upgrade_${user.id}_${Date.now()}`,
      notes: {
        flow: "tier_upgrade",
        from_tier: currentSub.tier,
        to_tier: toTier,
        subscription_id: currentSub.id,
        user_id: user.id,
        base_pro_rate_paise: proRatePaise.toString(),
        gst_paise: (gst.cgst + gst.sgst).toString(),
        // Legacy key kept for back-compat with any existing webhook/verify
        // logic that reads `base_amount`. Same value as base_pro_rate_paise.
        base_amount: proRatePaise.toString(),
      },
    })

    // 9. Profile lookup for checkout prefill.
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle()

    return NextResponse.json({
      orderId: order.id,
      amountPaise,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      prefill: {
        name: profile?.full_name ?? "",
        email: user.email ?? "",
      },
      notes: {
        flow: "tier_upgrade",
        from_tier: currentSub.tier,
        to_tier: toTier,
        subscription_id: currentSub.id,
      },
      // Surface the current tier so the client UI does not need a second
      // request to render the confirmation screen.
      currentTier: state.tier,
    })
  } catch (err) {
    if (err instanceof TierAccessError) return err.response
    if (err instanceof TierChangeError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      )
    }
    console.error("[POST /api/subscription/upgrade] unexpected error:", err)
    return NextResponse.json(
      { error: "Failed to start upgrade" },
      { status: 500 },
    )
  }
}
