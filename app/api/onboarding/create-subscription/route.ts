import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { createSubscription } from "@/lib/razorpay-subscriptions"
import type { ProductTier } from "@/lib/plans"

// Phase 2A: accept tier in the request body. Default to 'library' only when
// the field is absent (back-compat for any legacy clients still in flight
// during the rollout). New clients should always pass `tier` explicitly.
const createSubSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  tier: z.enum(["library", "workshop", "ai_lab"]).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createSubSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      )
    }

    const { sessionId } = parsed.data
    const tier: ProductTier = parsed.data.tier ?? "library"
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

    // If session already has a subscription, return it (idempotent)
    if (session.razorpay_subscription_id) {
      return NextResponse.json({
        subscriptionId: session.razorpay_subscription_id,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      })
    }

    // Create Razorpay subscription on the tier-specific plan. Razorpay notes
    // become the source of truth for tier — the webhook reads them back to
    // populate the subscriptions row.
    const { subscription: rzpSubscription } = await createSubscription({
      email: session.email,
      sessionId,
      tier,
    })

    // Update session with subscription ID and a tier-aware plan_id label so
    // operators reading onboarding_sessions can see at a glance which tier
    // the user picked. Schema-compatible: the column is free-form text.
    await supabase
      .from("onboarding_sessions")
      .update({
        razorpay_subscription_id: rzpSubscription.id,
        plan_id: `${tier}_monthly`,
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
