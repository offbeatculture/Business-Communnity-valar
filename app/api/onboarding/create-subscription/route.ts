import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { createSubscription } from "@/lib/razorpay-subscriptions"

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
    // Important: this means the first selected tier wins for this session.
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

    // Update session with subscription ID and selected tier
    await supabase
      .from("onboarding_sessions")
      .update({
        razorpay_subscription_id: rzpSubscription.id,
        selected_tier: tier,
        status: "payment_pending",
        updated_at: new Date().toISOString(),
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