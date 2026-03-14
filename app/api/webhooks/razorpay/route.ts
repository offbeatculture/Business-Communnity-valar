import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateInvoice } from "@/lib/invoice"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-razorpay-signature") ?? ""
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ""

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex")

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const event = JSON.parse(body)

    if (event.event !== "payment.captured") {
      return NextResponse.json({ message: "Event ignored" })
    }

    const payment = event.payload?.payment?.entity
    if (!payment) {
      return NextResponse.json({ error: "Missing payment data" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Idempotency check
    const { data: existing } = await adminClient
      .from("subscriptions")
      .select("id")
      .eq("razorpay_payment_id", payment.id)
      .single()

    if (existing) {
      return NextResponse.json({ message: "Already processed" })
    }

    const notes = payment.notes ?? {}
    const userId = notes.user_id
    const planId = notes.plan_id ?? "monthly"
    const planLabel = notes.plan_label ?? "Subscription"
    const baseAmount = parseInt(notes.base_amount ?? "0", 10)
    const durationDays = parseInt(notes.duration_days ?? "30", 10)

    if (!userId) {
      console.error("Webhook: missing user_id in payment notes")
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 })
    }

    const startsAt = new Date()
    const expiresAt = new Date(startsAt)
    expiresAt.setDate(expiresAt.getDate() + durationDays)

    // Create subscription
    const { data: subscription } = await adminClient
      .from("subscriptions")
      .insert({
        user_id: userId,
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        plan_name: planId,
        amount_paid: payment.amount,
        currency: payment.currency ?? "INR",
        status: "active",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single()

    // Get user profile for invoice
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, gstin, business_name")
      .eq("user_id", userId)
      .single()

    if (subscription) {
      generateInvoice({
        userId,
        subscriptionId: subscription.id,
        planLabel,
        basePaise: baseAmount,
        customerName: profile?.full_name ?? "Customer",
        customerEmail: payment.email ?? "",
        customerGstin: profile?.gstin,
        customerBusinessName: profile?.business_name,
      }).catch((err) => console.error("Webhook invoice error:", err))
    }

    return NextResponse.json({ message: "Payment recorded" })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
