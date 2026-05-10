// ============================================================
// POST /api/subscription/upgrade/verify
//
// Called by the client after Razorpay checkout returns success for the
// pro-rate order created by POST /api/subscription/upgrade.
//
// Flow:
//   1. requireActiveSubscription
//   2. Validate body { razorpay_order_id, razorpay_payment_id, razorpay_signature, to_tier }
//   3. Verify HMAC-SHA256 signature (same pattern as /api/razorpay/verify-payment)
//   4. Defensive re-validation of tier rank and D5 frequency lock
//   5. applyUpgradeImmediate — cancels old Razorpay sub, marks old row
//      cancelled, creates new Razorpay sub, inserts new subscription row
//   6. recordTierChange (audit row) with change_type='upgrade'
//   7. Return { success, newTier, newTierRank, newExpiresAt }
// ============================================================

import { NextResponse } from "next/server"
import crypto from "crypto"
import { z } from "zod/v4"
import {
  requireActiveSubscription,
  TierAccessError,
} from "@/lib/auth/tier"
import { createClient } from "@/lib/supabase/server"
import { getTierRank, type ProductTier } from "@/lib/plans"
import {
  applyUpgradeImmediate,
  getActiveSubscriptionForUser,
  hasRecentTierChange,
  recordTierChange,
  TierChangeError,
} from "@/lib/subscription/tier-change"

const VerifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  to_tier: z.enum(["library", "workshop", "ai_lab"]),
})

export async function POST(request: Request) {
  try {
    // 1. Auth + active subscription required.
    await requireActiveSubscription()

    // 2. Parse body.
    const body = await request.json().catch(() => null)
    const parsed = VerifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 },
      )
    }
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      to_tier,
    } = parsed.data
    const toTier: ProductTier = to_tier

    // 3. Verify HMAC-SHA256 signature. Mirrors lib/razorpay verify-payment.
    const secret = process.env.RAZORPAY_KEY_SECRET ?? ""
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")

    if (expected !== razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 4. Re-read current subscription and re-validate. Don't trust client
    //    state — anything could have happened between /upgrade and /verify.
    const currentSub = await getActiveSubscriptionForUser(supabase, user.id)

    if (getTierRank(toTier) <= getTierRank(currentSub.tier)) {
      return NextResponse.json(
        {
          error:
            "Target tier must be strictly higher than current tier — refusing to apply.",
          currentTier: currentSub.tier,
          requestedTier: toTier,
        },
        { status: 400 },
      )
    }

    const already = await hasRecentTierChange(
      supabase,
      user.id,
      currentSub.starts_at,
    )
    if (already) {
      return NextResponse.json(
        {
          error: `You already changed tier this billing period. Refund will be processed for this payment via support.`,
          nextChangeAvailableAt: currentSub.expires_at,
        },
        { status: 409 },
      )
    }

    // 5. Read pro-rate from the order notes so the audit row reflects the
    //    exact paise the user paid. We fetch the order from Razorpay to
    //    keep the verify route self-contained.
    const { razorpay: razorpayLib } = await import("@/lib/razorpay")
    const order = await razorpayLib.orders.fetch(razorpay_order_id)
    const orderNotes = (order.notes ?? {}) as Record<string, string>
    const proRatedPaise =
      parseInt(orderNotes.base_amount ?? "0", 10) ||
      (typeof order.amount === "string"
        ? parseInt(order.amount, 10)
        : order.amount)

    // 6. Execute the immediate switch.
    const { newSubscriptionId } = await applyUpgradeImmediate(supabase, {
      userId: user.id,
      oldSubscription: currentSub,
      newTier: toTier,
      userEmail: user.email ?? "",
    })

    // 7. Record audit row. effective_at = now (immediate switch).
    await recordTierChange(supabase, {
      userId: user.id,
      subscriptionId: newSubscriptionId,
      fromTier: currentSub.tier,
      toTier,
      changeType: "upgrade",
      effectiveAt: new Date(),
      proRatedPaise: proRatedPaise > 0 ? proRatedPaise : null,
    })

    // 8. Read back new expiry for response.
    const { data: newSubRow } = await supabase
      .from("subscriptions")
      .select("expires_at")
      .eq("id", newSubscriptionId)
      .single()

    return NextResponse.json({
      success: true,
      newTier: toTier,
      newTierRank: getTierRank(toTier),
      newExpiresAt: (newSubRow?.expires_at as string | null) ?? null,
    })
  } catch (err) {
    if (err instanceof TierAccessError) return err.response
    if (err instanceof TierChangeError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      )
    }
    console.error("[POST /api/subscription/upgrade/verify] unexpected error:", err)
    return NextResponse.json(
      { error: "Failed to verify upgrade" },
      { status: 500 },
    )
  }
}
