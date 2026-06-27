import type { Subscriptions } from "razorpay/dist/types/subscriptions"
import { razorpay } from "@/lib/razorpay"
import { SINGLE_PLAN, type ProductTier } from "@/lib/plans"

// =============================================================================
// Razorpay subscription helpers — Single Plan
//
// Single active plan:
// Breathwork Community Membership — ₹999/month
//
// Required env:
// RAZORPAY_PLAN_ID_MONTHLY=plan_xxxxxxxxxxxxx
// =============================================================================

const SINGLE_TIER: ProductTier = "membership"

export function getRazorpayPlanIdForTier(_tier?: ProductTier): string {
  const planId = process.env.RAZORPAY_PLAN_ID_MONTHLY

  if (!planId) {
    throw new Error(
      "RAZORPAY_PLAN_ID_MONTHLY is not configured. " +
        "Set this env var to the Razorpay plan ID for Breathwork Community Membership."
    )
  }

  return planId
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
  const planId = getRazorpayPlanIdForTier(tier)

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