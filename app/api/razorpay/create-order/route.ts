import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { razorpay } from "@/lib/razorpay"
import { getPlansForCurrentTier, calculateGST } from "@/lib/plans"

const CreateOrderSchema = z.object({
  planId: z.enum(["monthly", "annual"]),
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
