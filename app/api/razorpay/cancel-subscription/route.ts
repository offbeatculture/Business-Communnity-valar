import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cancelSubscription } from "@/lib/razorpay-subscriptions"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subscriptionId } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Missing subscription ID" },
        { status: 400 }
      )
    }

    // Verify user owns this subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, razorpay_subscription_id")
      .eq("user_id", user.id)
      .eq("razorpay_subscription_id", subscriptionId)
      .single()

    if (!sub) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    // Cancel at end of billing cycle
    await cancelSubscription(subscriptionId, true)

    // Update local record
    await supabase
      .from("subscriptions")
      .update({ recurring_status: "cancelled" })
      .eq("id", sub.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cancel subscription error:", error)
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}
