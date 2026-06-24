import { NextResponse } from "next/server"
import { z } from "zod/v4"
import crypto from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateInvoice } from "@/lib/invoice"
import { SINGLE_PLAN, type ProductTier } from "@/lib/plans"

const VerifySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_signature: z.string(),
})

const SINGLE_TIER: ProductTier = "membership"

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseInt(value, 10)
  return fallback
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = VerifySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = parsed.data

    const secret = process.env.RAZORPAY_KEY_SECRET ?? ""

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: existing } = await adminClient
      .from("subscriptions")
      .select("id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ message: "Payment already processed" })
    }

    const { razorpay: razorpayLib } = await import("@/lib/razorpay")
    const order = await razorpayLib.orders.fetch(razorpay_order_id)

    const notes = (order.notes ?? {}) as Record<string, string>

    const durationDays = toNumber(
      notes.duration_days,
      SINGLE_PLAN.durationDays
    )

    const baseAmount = toNumber(
      notes.base_amount,
      SINGLE_PLAN.amountPaise
    )

    const amountPaid = toNumber(
      order.amount,
      SINGLE_PLAN.amountPaise
    )

    const startsAt = new Date()
    const expiresAt = new Date(startsAt)
    expiresAt.setDate(expiresAt.getDate() + durationDays)

    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, gstin, business_name")
      .eq("user_id", user.id)
      .single()

    await adminClient
      .from("subscriptions")
      .update({
        status: "expired",
        recurring_status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .neq("razorpay_payment_id", razorpay_payment_id)

    const { data: subscription, error: subError } = await adminClient
      .from("subscriptions")
      .insert({
        user_id: user.id,

        razorpay_payment_id,
        razorpay_order_id,
        razorpay_subscription_id: null,
        razorpay_plan_id: null,

        plan_id: SINGLE_PLAN.id,
        plan_name: SINGLE_PLAN.name,

        amount_paid: amountPaid,
        amount_paise: amountPaid,
        currency: "INR",

        status: "active",
        recurring_status: "active",

        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),

        tier: SINGLE_TIER,
        tier_rank: 1,
        locked_price_paise: baseAmount,
        band_at_signup: "membership",

        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (subError) {
      console.error("Subscription insert error:", subError)

      return NextResponse.json(
        { error: "Failed to record subscription" },
        { status: 500 }
      )
    }

    generateInvoice({
      userId: user.id,
      subscriptionId: subscription.id,
      planLabel: SINGLE_PLAN.name,
      basePaise: baseAmount,
      customerName: profile?.full_name ?? "Customer",
      customerEmail: user.email ?? "",
      customerGstin: profile?.gstin,
      customerBusinessName: profile?.business_name,
    }).catch((err) => console.error("Invoice generation error:", err))

    return NextResponse.json({
      message: "Payment verified",
      planId: SINGLE_PLAN.id,
      planName: SINGLE_PLAN.name,
      tier: SINGLE_TIER,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error("Verify payment error:", error)

    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    )
  }
}