import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { createSubscription, fetchSubscription,fetchPlanDetails } from "@/lib/razorpay-subscriptions"
import { log } from "console"

const createSubSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  tier: z.enum(["library", "workshop", "ai_lab"]).default("library"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createSubSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid subscription request" },
        { status: 400 }
      )
    }

    const { sessionId, tier } = parsed.data
    const supabase = createAdminClient()

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from("onboarding_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Onboarding session not found" },
        { status: 404 }
      )
    }

    // Check session is valid
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from("onboarding_sessions")
        .update({ status: "expired" })
        .eq("id", sessionId)

      return NextResponse.json(
        { error: "Session has expired. Please start over." },
        { status: 410 }
      )
    }

    if (!["pending", "payment_pending"].includes(session.status)) {
      return NextResponse.json(
        { error: "Session is not in a valid state for payment" },
        { status: 400 }
      )
    }

    // If session already has a subscription, return it idempotently.
    if (session.razorpay_subscription_id) {
      return NextResponse.json({
        subscriptionId: session.razorpay_subscription_id,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      })
    }

    // Create Razorpay subscription for selected tier
    const rzpSubscription = await createSubscription({
      email: session.email,
      sessionId,
      tier,
    })

    // Fetch the subscription details to get the actual amount
    const subscriptionDetails = await fetchSubscription(rzpSubscription.id)

    // Fetch the plan details using the plan_id from the subscription
    const planDetails = await fetchPlanDetails(subscriptionDetails.plan_id)

    console.log("paln",planDetails)

    // Get the correct amount_paid from the plan details
    const amountPaid = planDetails.item.amount; 
    const tierPlan = planDetails.item.name // This should be the actual amount (in paise)

    // Update session with subscription ID, selected tier, and the correct amount paid
    await supabase
      .from("onboarding_sessions")
      .update({
        razorpay_subscription_id: rzpSubscription.id,
        selected_tier: tier,
        status: "payment_pending",
        amount_paid: amountPaid, // Store the correct amount here
        updated_at: new Date().toISOString(),
        tier:tierPlan
      })
      .eq("id", sessionId)

    return NextResponse.json({
      subscriptionId: rzpSubscription.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error("POST /api/onboarding/create-subscription error:", error)

    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    )
  }
}