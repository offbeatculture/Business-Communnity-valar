import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { razorpay } from "@/lib/razorpay"

const PLAN_CONFIG = {
  workshop_monthly: {
    tier: "workshop",
    label: "Workshop Monthly",
    amountPaise: 129900,
    durationDays: 30,
  },
  ai_lab_monthly: {
    tier: "ai_lab",
    label: "AI Lab Monthly",
    amountPaise: 149900,
    durationDays: 30,
  },
} as const

const CreateOrderSchema = z.object({
  planId: z.enum(["workshop_monthly", "ai_lab_monthly"]),
})

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

    console.log("CREATE ORDER BODY:", body)

    const parsed = CreateOrderSchema.safeParse(body)

    if (!parsed.success) {
      console.log("CREATE ORDER VALIDATION ERROR:", parsed.error.flatten())

      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const planId = parsed.data.planId
    const plan = PLAN_CONFIG[planId]

    console.log("SELECTED ORDER PLAN:", {
      planId,
      tier: plan.tier,
      amountPaise: plan.amountPaise,
      label: plan.label,
    })

    const receipt = `ord_${Date.now()}_${user.id.slice(0, 8)}`
    const order = await razorpay.orders.create({
      amount: plan.amountPaise,
      currency: "INR",
      receipt,
      notes: {
        user_id: user.id,
        plan_id: planId,
        plan_label: plan.label,
        base_amount: plan.amountPaise.toString(),
        duration_days: plan.durationDays.toString(),
        tier: plan.tier,
      },
    })

    console.log("RAZORPAY ORDER CREATED:", {
      orderId: order.id,
      planId,
      amount: plan.amountPaise,
      tier: plan.tier,
    })

    return NextResponse.json({
      orderId: order.id,
      amount: plan.amountPaise,
      currency: "INR",
      planLabel: plan.label,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error("Create order error:", error)

    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}