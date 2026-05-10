import { NextResponse } from "next/server"
import { z } from "zod/v4"
import crypto from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateInvoice } from "@/lib/invoice"
import {
  getTierBand,
  getTierRank,
  type ProductTier,
} from "@/lib/plans"

const VerifySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_signature: z.string(),
})

function isProductTier(value: unknown): value is ProductTier {
  return value === "library" || value === "workshop" || value === "ai_lab"
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = VerifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = parsed.data

    // Verify HMAC-SHA256 signature
    const secret = process.env.RAZORPAY_KEY_SECRET ?? ""
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Idempotency check
    const { data: existing } = await adminClient
      .from("subscriptions")
      .select("id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .single()

    if (existing) {
      return NextResponse.json({ message: "Payment already processed" })
    }

    // Fetch order to get plan info from notes
    const { razorpay: razorpayLib } = await import("@/lib/razorpay")
    const order = await razorpayLib.orders.fetch(razorpay_order_id)
    const notes = (order.notes ?? {}) as Record<string, string>
    const planId = notes.plan_id ?? "monthly"
    const planLabel = notes.plan_label ?? "Subscription"
    const baseAmount = parseInt(notes.base_amount ?? "0", 10)
    const durationDays = parseInt(notes.duration_days ?? "30", 10)
    // Tier from order notes (set by create-order). Default 'library' for any
    // legacy orders created before this field existed.
    const tier: ProductTier = isProductTier(notes.tier) ? notes.tier : "library"

    // Calculate dates
    const startsAt = new Date()
    const expiresAt = new Date(startsAt)
    expiresAt.setDate(expiresAt.getDate() + durationDays)

    // Tier-aware fields. Same band-derived fallback as the webhook so legacy
    // one-time rows always carry sensible tier metadata.
    const { count: activeCount } = await adminClient
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())

    const band = getTierBand(tier, activeCount ?? 0)
    const lockedPricePaise = baseAmount > 0 ? baseAmount : band.monthlyPaise

    // Get user profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, gstin, business_name")
      .eq("user_id", user.id)
      .single()

    // Create subscription
    const { data: subscription, error: subError } = await adminClient
      .from("subscriptions")
      .insert({
        user_id: user.id,
        razorpay_payment_id,
        razorpay_order_id,
        plan_name: planId,
        amount_paid: typeof order.amount === "string" ? parseInt(order.amount, 10) : order.amount,
        currency: "INR",
        status: "active",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        tier,
        tier_rank: getTierRank(tier),
        locked_price_paise: lockedPricePaise,
        band_at_signup: band.band,
        // One-time payments don't bind to a Razorpay plan.
        razorpay_plan_id: null,
      })
      .select("id")
      .single()

    if (subError) {
      console.error("Subscription insert error:", subError)
      return NextResponse.json({ error: "Failed to record subscription" }, { status: 500 })
    }

    // Generate invoice (non-blocking)
    generateInvoice({
      userId: user.id,
      subscriptionId: subscription.id,
      planLabel,
      basePaise: baseAmount,
      customerName: profile?.full_name ?? "Customer",
      customerEmail: user.email ?? "",
      customerGstin: profile?.gstin,
      customerBusinessName: profile?.business_name,
    }).catch((err) => console.error("Invoice generation error:", err))

    return NextResponse.json({
      message: "Payment verified",
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error("Verify payment error:", error)
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 })
  }
}
