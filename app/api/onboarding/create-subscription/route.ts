import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { createSubscription } from "@/lib/razorpay-subscriptions"
import { SINGLE_PLAN, type ProductTier } from "@/lib/plans"

const SINGLE_TIER: ProductTier = "membership"

const createSubSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  tier: z.enum(["membership"]).optional(),
  planId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log("CREATE SUBSCRIPTION BODY:", body)

    const parsed = createSubSchema.safeParse(body)

    if (!parsed.success) {
      console.log("CREATE SUBSCRIPTION VALIDATION ERROR:", parsed.error.flatten())

      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { sessionId } = parsed.data
    const tier = SINGLE_TIER

    console.log("SELECTED PLAN:", {
      tier,
      planId: SINGLE_PLAN.id,
      planName: SINGLE_PLAN.name,
      amount: SINGLE_PLAN.amountRupees,
      envKey: SINGLE_PLAN.razorpayPlanEnvKey,
    })

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
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        })
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
        planId: session.plan_id,
      })

      return NextResponse.json({
        subscriptionId: session.razorpay_subscription_id,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      })
    }

    console.log("CALLING createSubscription WITH:", {
      email: session.email,
      sessionId,
      tier,
      planId: SINGLE_PLAN.id,
    })

    const {
      subscription: rzpSubscription,
      planId,
      tier: createdTier,
    } = await createSubscription({
      email: session.email,
      sessionId,
      tier,
    })

    console.log("RAZORPAY SUBSCRIPTION CREATED:", {
      subscriptionId: rzpSubscription.id,
      requestedTier: tier,
      createdTier,
      planId,
    })

    await supabase
      .from("onboarding_sessions")
      .update({
        razorpay_subscription_id: rzpSubscription.id,
        plan_id: SINGLE_PLAN.id,
        status: "payment_pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    console.log("ONBOARDING SESSION UPDATED:", {
      sessionId,
      subscriptionId: rzpSubscription.id,
      plan_id: SINGLE_PLAN.id,
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