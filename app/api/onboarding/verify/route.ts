import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    } = body

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing payment verification fields" },
        { status: 400 }
      )
    }

    // Verify HMAC signature
    const secret = process.env.RAZORPAY_KEY_SECRET ?? ""
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Find the onboarding session by subscription ID
    const { data: session } = await supabase
      .from("onboarding_sessions")
      .select("id, email, status")
      .eq("razorpay_subscription_id", razorpay_subscription_id)
      .single()

    if (session && session.status === "payment_pending") {
      await supabase
        .from("onboarding_sessions")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
    }

    // Note: actual user creation happens in the webhook (subscription.activated)
    // This endpoint just confirms the payment was genuine to the frontend
    return NextResponse.json({
      success: true,
      message: "Payment verified. Check your email for your login link.",
      email: session?.email,
    })
  } catch (error) {
    console.error("POST /api/onboarding/verify error:", error)
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    )
  }
}
