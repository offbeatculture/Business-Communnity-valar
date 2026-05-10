import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { razorpay } from "@/lib/razorpay"
import { getPlansForCurrentTier, calculateGST } from "@/lib/plans"

// Phase 2A: accept tier in the body so the legacy one-time payment path can
// be triggered for any of the three product tiers. The pricing math itself
// still flows through `getPlansForCurrentTier` (legacy single-tier bands)
// because the public plans page rewrite to the 3-tier × 5-band shape lives
// in a separate Phase 2B task. Tier only affects what we stamp into order
// notes so the verify-payment + webhook handlers persist the right metadata.
const CreateOrderSchema = z.object({
  planId: z.enum(["monthly", "annual"]),
  tier: z.enum(["library", "workshop", "ai_lab"]).optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreateOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    // Default to 'library' for legacy callers that don't yet send tier.
    const tier = parsed.data.tier ?? "library"

    // Get active subscriber count for tier pricing
    const { count } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())

    const plans = getPlansForCurrentTier(count ?? 0)
    const plan = plans.find((p) => p.id === parsed.data.planId)

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 400 })
    }

    const gst = calculateGST(plan.pricePaise)

    const order = await razorpay.orders.create({
      amount: gst.total,
      currency: "INR",
      receipt: `order_${user.id}_${Date.now()}`,
      notes: {
        user_id: user.id,
        plan_id: plan.id,
        plan_label: plan.label,
        base_amount: plan.pricePaise.toString(),
        duration_days: plan.durationDays.toString(),
        tier,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: gst.total,
      currency: "INR",
      planLabel: plan.label,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      gst: {
        base: gst.base,
        cgst: gst.cgst,
        sgst: gst.sgst,
        total: gst.total,
      },
    })
  } catch (error) {
    console.error("Create order error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
