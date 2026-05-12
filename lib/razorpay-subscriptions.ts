import { razorpay } from "@/lib/razorpay"

export type SubscriptionTier = "library" | "workshop" | "ai_lab"

// const LEGACY_PLAN_ID_MONTHLY = process.env.RAZORPAY_PLAN_ID_MONTHLY ?? ""

const PLAN_IDS: Record<SubscriptionTier, string> = {
  library:  process.env.RAZORPAY_PLAN_ID_LIBRARY_MONTHLY ?? "",
  workshop: process.env.RAZORPAY_PLAN_ID_WORKSHOP_MONTHLY ?? "",
  ai_lab:   process.env.RAZORPAY_PLAN_ID_AI_LAB_MONTHLY ?? "",
}
function getPlanIdForTier(tier: SubscriptionTier) {
  const planId = PLAN_IDS[tier]

  if (!planId) {
    throw new Error(`Razorpay plan ID is not configured for tier: ${tier}`)
  }

  return planId
}

export async function createSubscription({
  email,
  sessionId,
  tier = "library",
}: {
  email: string
  sessionId: string
  tier?: SubscriptionTier
}) {
  const planId = getPlanIdForTier(tier)

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 120, // max billing cycles (10 years monthly)
    customer_notify: 0, // we handle emails via SES
    notes: {
      onboarding_session_id: sessionId,
      email,
      tier,
    },
  })

  return subscription
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

export async function fetchPlanDetails(planId: string) {
  try {
    const planDetails = await razorpay.plans.fetch(planId)
    return planDetails
  } catch (error) {
    throw new Error("Failed to fetch plan details")
  }
}