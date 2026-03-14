import { razorpay } from "@/lib/razorpay"

const PLAN_ID_MONTHLY = process.env.RAZORPAY_PLAN_ID_MONTHLY ?? ""

export async function createSubscription({
  email,
  sessionId,
}: {
  email: string
  sessionId: string
}) {
  if (!PLAN_ID_MONTHLY) {
    throw new Error("RAZORPAY_PLAN_ID_MONTHLY is not configured")
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: PLAN_ID_MONTHLY,
    total_count: 120, // max billing cycles (10 years monthly)
    customer_notify: 0, // we handle emails via SES
    notes: {
      onboarding_session_id: sessionId,
      email,
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
