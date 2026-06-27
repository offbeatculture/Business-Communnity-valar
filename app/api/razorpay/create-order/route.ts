import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { razorpay } from "@/lib/razorpay"
import { SINGLE_PLAN, type ProductTier } from "@/lib/plans"

const SINGLE_TIER: ProductTier = "membership"

const CreateOrderSchema = z.object({
  planId: z.literal(SINGLE_PLAN.id).optional(),
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

      return NextResponse.json(
        {
          error: "Invalid plan",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const receipt = `ord_${Date.now()}_${user.id.slice(0, 8)}`

    const order = await razorpay.orders.create({
      amount: SINGLE_PLAN.amountPaise,
      currency: "INR",
      receipt,
      notes: {
        user_id: user.id,
        plan_id: SINGLE_PLAN.id,
        plan_label: SINGLE_PLAN.name,
        base_amount: SINGLE_PLAN.amountPaise.toString(),
        duration_days: SINGLE_PLAN.durationDays.toString(),
        tier: SINGLE_TIER,
        purpose: "renewal",
      },
    })

    console.log("RAZORPAY ORDER CREATED:", {
      orderId: order.id,
      planId: SINGLE_PLAN.id,
      amount: SINGLE_PLAN.amountPaise,
      tier: SINGLE_TIER,
      planName: SINGLE_PLAN.name,
    })

    return NextResponse.json({
      orderId: order.id,
      amount: SINGLE_PLAN.amountPaise,
      currency: "INR",
      planId: SINGLE_PLAN.id,
      planLabel: SINGLE_PLAN.name,
      tier: SINGLE_TIER,
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