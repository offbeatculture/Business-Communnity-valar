import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { razorpay } from "@/lib/razorpay"
import { SINGLE_PLAN, type ProductTier } from "@/lib/plans"

const SINGLE_TIER: ProductTier = "membership"

/** Prices a member can be locked at. Anything else renews at the current price. */
const RENEWAL_PRICES_PAISE = new Set([99900, 149900])

const CreateOrderSchema = z.object({
  // There is one membership plan. The /renew page still sends its old plan
  // ids, so any id is accepted; the price comes from the member's record.
  planId: z.string().max(50).optional(),
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

    // Renew at the member's own price: a ₹999 member stays at ₹999. The latest
    // subscription row holds it (locked_price_paise); new or unknown prices
    // fall back to the current plan price.
    const { data: lastSub } = await supabase
      .from("subscriptions")
      .select("locked_price_paise")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const locked = Number(lastSub?.locked_price_paise)
    const amountPaise = RENEWAL_PRICES_PAISE.has(locked) ? locked : SINGLE_PLAN.amountPaise

    const receipt = `ord_${Date.now()}_${user.id.slice(0, 8)}`

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        user_id: user.id,
        plan_id: SINGLE_PLAN.id,
        plan_label: SINGLE_PLAN.name,
        base_amount: amountPaise.toString(),
        duration_days: SINGLE_PLAN.durationDays.toString(),
        tier: SINGLE_TIER,
        purpose: "renewal",
      },
    })

    console.log("RAZORPAY ORDER CREATED:", {
      orderId: order.id,
      planId: SINGLE_PLAN.id,
      amount: amountPaise,
      tier: SINGLE_TIER,
      planName: SINGLE_PLAN.name,
    })

    return NextResponse.json({
      orderId: order.id,
      amount: amountPaise,
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