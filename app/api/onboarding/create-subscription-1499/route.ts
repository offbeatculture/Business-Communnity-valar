import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { createSubscription } from "@/lib/razorpay-subscriptions"

const createSubSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  tier: z.enum(["library", "workshop", "ai_lab"]).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log("CREATE SUBSCRIPTION BODY:", body)

    const parsed = createSubSchema.safeParse(body)

    if (!parsed.success) {
      console.log("CREATE SUBSCRIPTION VALIDATION ERROR:", parsed.error.flatten())
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      )
    }

    const { sessionId } = parsed.data
    const tier = parsed.data.tier ?? "ai_lab" // default tier name, for logging only

    console.log("SELECTED TIER:", tier)
    console.log("SESSION ID:", sessionId)

    const supabase = createAdminClient()

    const { data: session, error: sessionError } = await supabase
      .from("onboarding_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    console.log("ONBOARDING SESSION:", {
      found: !!session,
      email: session?.email,
      status: session?.status,
      existingSubscriptionId: session?.razorpay_subscription_id,
      sessionError,
    })

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Onboarding session not found" },
        { status: 404 }
      )
    }

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

    if (session.razorpay_subscription_id) {
      console.log("REUSING EXISTING SUBSCRIPTION:", {
        subscriptionId: session.razorpay_subscription_id,
        requestedTier: tier,
        existingPlanId: session.plan_id,
      })

      return NextResponse.json({
        subscriptionId: session.razorpay_subscription_id,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      })
    }

    console.log("CALLING createSubscription WITH FIXED PLAN ID:", {
      email: session.email,
      sessionId,
      fixedPlanId: "plan_So30soR2w1VtxZ",
    })

    // Hardcoded Razorpay plan for 1499 / ai_monthly
    const { subscription: rzpSubscription } = await createSubscription({
      email: session.email,
      sessionId,
      planId: "plan_So30soR2w1VtxZ",
    })

    console.log("RAZORPAY SUBSCRIPTION CREATED:", {
      subscriptionId: rzpSubscription.id,
      planId: "plan_So30soR2w1VtxZ",
    })

    await supabase
      .from("onboarding_sessions")
      .update({
        razorpay_subscription_id: rzpSubscription.id,
        plan_id: "plan_So30soR2w1VtxZ",
        status: "payment_pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    console.log("ONBOARDING SESSION UPDATED:", {
      sessionId,
      subscriptionId: rzpSubscription.id,
      plan_id: "plan_So30soR2w1VtxZ",
    })

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