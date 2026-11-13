import type { Subscriptions } from "razorpay/dist/types/subscriptions"
import { razorpay } from "@/lib/razorpay"
import { SINGLE_PLAN, type ProductTier } from "@/lib/plans"
import { CHECKOUT_PLAN_ID } from "@/lib/billing/plan-ids"

// =============================================================================
// Razorpay subscription helpers — Single Plan
//
// Single active plan:
// Breathwork Community Membership — ₹1499/month
//
// Plan ID: lib/billing/plan-ids.ts
// =============================================================================

const SINGLE_TIER: ProductTier = "membership"

export function getRazorpayPlanIdForTier(_tier?: ProductTier): string {
  // Plan IDs live in lib/billing/plan-ids.ts, not in env vars, so a stale
  // RAZORPAY_PLAN_ID_MONTHLY can't break checkout.
  return CHECKOUT_PLAN_ID
}

export type CreateSubscriptionArgs = {
  email: string
  sessionId: string
  tier?: ProductTier
  planId?: string
}

export type CreateSubscriptionResult = {
  subscription: Subscriptions.RazorpaySubscription
  planId: string
  tier: ProductTier
}

export async function createSubscription(
  args: CreateSubscriptionArgs
): Promise<CreateSubscriptionResult> {
  const { email, sessionId } = args

  const tier = SINGLE_TIER
  const planId = args.planId ?? getRazorpayPlanIdForTier(tier)

  console.log("Creating Razorpay subscription:", {
    tier,
    planId,
    email,
    sessionId,
    planName: SINGLE_PLAN.name,
    amount: SINGLE_PLAN.amountRupees,
  })

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 120,
    customer_notify: 0,
    notes: {
      onboarding_session_id: sessionId,
      email,
      tier,
      plan_id: SINGLE_PLAN.id,
      plan_name: SINGLE_PLAN.name,
      amount_paise: String(SINGLE_PLAN.amountPaise),
    },
  })

  return {
    subscription,
    planId,
    tier,
  }
}

export async function fetchSubscription(subscriptionId: string) {
  return razorpay.subscriptions.fetch(subscriptionId)
}

export async function cancelSubscription(
  subscriptionId: string,
  cancelAtCycleEnd = true
) {
  return razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd)
}