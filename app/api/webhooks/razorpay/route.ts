import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateInvoice } from "@/lib/invoice"
import { createMagicLoginToken } from "@/lib/magic-link"
import { sendMagicLinkEmail, sendPaymentConfirmationEmail } from "@/lib/ses"
import { SINGLE_PLAN, type ProductTier } from "@/lib/plans"

const SINGLE_TIER: ProductTier = "membership"

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseInt(value, 10)
  return fallback
}

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-razorpay-signature") ?? ""
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ""

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex")

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const event = JSON.parse(body)
    const eventType = event.event as string

    const adminClient = createAdminClient()

    const dedupeId =
      eventType === "payment.captured"
        ? `payment.captured:${event.payload?.payment?.entity?.id}`
        : `${eventType}:${event.payload?.subscription?.entity?.id}`

    const { error: dedupeError } = await adminClient
      .from("webhook_events")
      .insert({
        event_type: eventType,
        razorpay_event_id: dedupeId,
        payload: event,
      })

    if (dedupeError?.code === "23505") {
      return NextResponse.json({ message: "Already processed" })
    }

    switch (eventType) {
      case "payment.captured":
        return handlePaymentCaptured(event, adminClient)

      case "subscription.activated":
        return handleSubscriptionActivated(event, adminClient)

      case "subscription.charged":
        return handleSubscriptionCharged(event, adminClient)

      case "subscription.cancelled":
        return handleSubscriptionStatusChange(event, adminClient, "cancelled")

      case "subscription.completed":
        return handleSubscriptionCompleted(event, adminClient)

      default:
        return NextResponse.json({ message: "Event ignored" })
    }
  } catch (error) {
    console.error("Webhook error:", error)

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

// =============================================
// Backup flow: one-time payment captured
// =============================================

async function handlePaymentCaptured(
  event: Record<string, unknown>,
  adminClient: ReturnType<typeof createAdminClient>
) {
  const payment = (event.payload as Record<string, unknown>)
    ?.payment as Record<string, unknown>

  const entity = payment?.entity as Record<string, unknown>

  if (!entity) {
    return NextResponse.json({ error: "Missing payment data" }, { status: 400 })
  }

  let notes = (entity.notes ?? {}) as Record<string, string>

  if ((!notes.user_id || !notes.plan_id) && entity.order_id) {
    try {
      const { razorpay } = await import("@/lib/razorpay")
      const order = await razorpay.orders.fetch(entity.order_id as string)
      notes = (order.notes ?? {}) as Record<string, string>
    } catch (err) {
      console.error("Failed to fetch Razorpay order notes:", err)
    }
  }

  const userId = notes.user_id

  if (!userId) {
    console.error("Webhook payment.captured: missing user_id in notes")
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 })
  }

  const razorpayPaymentId = entity.id as string

  const { data: existing } = await adminClient
    .from("subscriptions")
    .select("id")
    .eq("razorpay_payment_id", razorpayPaymentId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ message: "Already processed" })
  }

  const amountPaid = toNumber(entity.amount, SINGLE_PLAN.amountPaise)
  const baseAmount = toNumber(notes.base_amount, SINGLE_PLAN.amountPaise)
  const durationDays = toNumber(notes.duration_days, SINGLE_PLAN.durationDays)

  const startsAt = new Date()
  const expiresAt = new Date(startsAt)
  expiresAt.setDate(expiresAt.getDate() + durationDays)

  await adminClient
    .from("subscriptions")
    .update({
      status: "expired",
      recurring_status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .neq("razorpay_payment_id", razorpayPaymentId)

  const { data: subscription, error: insertError } = await adminClient
    .from("subscriptions")
    .insert({
      user_id: userId,

      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: entity.order_id as string,
      razorpay_subscription_id: null,
      razorpay_plan_id: null,

      plan_id: SINGLE_PLAN.id,
      plan_name: SINGLE_PLAN.name,
      plan_label: SINGLE_PLAN.name,

      base_amount_paise: baseAmount,
      amount_paid: amountPaid,
      amount_paise: amountPaid,
      currency: (entity.currency as string) ?? "INR",

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

  if (insertError) {
    console.error("Webhook payment.captured insert error:", insertError)

    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    )
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, gstin, business_name")
    .eq("user_id", userId)
    .single()

  if (subscription) {
    generateInvoice({
      userId,
      subscriptionId: subscription.id,
      planLabel: SINGLE_PLAN.name,
      basePaise: baseAmount,
      customerName: profile?.full_name ?? "Customer",
      customerEmail: (entity.email as string) ?? "",
      customerGstin: profile?.gstin,
      customerBusinessName: profile?.business_name,
    }).catch((err) => console.error("Webhook invoice error:", err))
  }

  return NextResponse.json({ message: "Payment recorded" })
}

// =============================================
// Subscription activated: create user + activate access
// =============================================

async function handleSubscriptionActivated(
  event: Record<string, unknown>,
  adminClient: ReturnType<typeof createAdminClient>
) {
  const payload = event.payload as Record<string, unknown>

  const subEntity = (payload?.subscription as Record<string, unknown>)
    ?.entity as Record<string, unknown>

  if (!subEntity) {
    return NextResponse.json(
      { error: "Missing subscription data" },
      { status: 400 }
    )
  }

  const rzpSubscriptionId = subEntity.id as string
  const notes = (subEntity.notes ?? {}) as Record<string, string>

  const sessionId = notes.onboarding_session_id
  const email = notes.email

  if (!email) {
    console.error("Webhook subscription.activated: missing email in notes")

    return NextResponse.json({ error: "Missing email" }, { status: 400 })
  }

  const { data: existingSubscription } = await adminClient
    .from("subscriptions")
    .select("id")
    .eq("razorpay_subscription_id", rzpSubscriptionId)
    .maybeSingle()

  if (existingSubscription) {
    return NextResponse.json({ message: "Subscription already activated" })
  }

  let session = null

  if (sessionId) {
    const { data } = await adminClient
      .from("onboarding_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle()

    session = data
  }

  if (!session) {
    const { data } = await adminClient
      .from("onboarding_sessions")
      .select("*")
      .eq("razorpay_subscription_id", rzpSubscriptionId)
      .maybeSingle()

    session = data
  }

  const { data: existingUsers } = await adminClient.auth.admin.listUsers()

  let user = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (!user) {
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          password_set: false,
        },
      })

    if (createError) {
      console.error("Failed to create user:", createError)

      return NextResponse.json(
        { error: "User creation failed" },
        { status: 500 }
      )
    }

    user = newUser.user
  }

  if (!user) {
    return NextResponse.json(
      { error: "User not found or created" },
      { status: 500 }
    )
  }

  await adminClient
    .from("subscriptions")
    .update({
      status: "expired",
      recurring_status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("status", "active")

  const razorpayPlanId =
    typeof subEntity.plan_id === "string" ? subEntity.plan_id : null

  const planAmountFromRazorpay =
    typeof subEntity.plan_amount === "number" ? subEntity.plan_amount : null

  const lockedPricePaise = SINGLE_PLAN.amountPaise

  const startsAt = new Date()
  const expiresAt = new Date(startsAt)
  expiresAt.setDate(expiresAt.getDate() + SINGLE_PLAN.durationDays)

  const { data: subscription, error: insertError } = await adminClient
    .from("subscriptions")
    .insert({
      user_id: user.id,

      razorpay_subscription_id: rzpSubscriptionId,
      razorpay_plan_id: razorpayPlanId,
      razorpay_payment_id: null,
      razorpay_order_id: null,

      plan_id: SINGLE_PLAN.id,
      plan_name: SINGLE_PLAN.name,
      plan_label: SINGLE_PLAN.name,

      base_amount_paise: lockedPricePaise,
      amount_paid: lockedPricePaise,
      amount_paise: lockedPricePaise,
      currency: "INR",

      status: "active",
      recurring_status: "active",

      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),

      tier: SINGLE_TIER,
      tier_rank: 1,
      locked_price_paise: lockedPricePaise,
      band_at_signup: "membership",

      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (insertError) {
    console.error("Webhook subscription.activated insert error:", insertError)

    return NextResponse.json(
      { error: "Failed to activate subscription" },
      { status: 500 }
    )
  }

  if (session) {
    await adminClient
      .from("onboarding_sessions")
      .update({
        status: "user_created",
        user_id: user.id,
        plan_id: SINGLE_PLAN.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)
  }

  try {
    const rawToken = await createMagicLoginToken(user.id)
    await sendMagicLinkEmail({
      to: email,
      token: rawToken,
    })
  } catch (err) {
    console.error("Failed to send magic link email:", err)
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, gstin, business_name")
    .eq("user_id", user.id)
    .single()

  if (subscription) {
    generateInvoice({
      userId: user.id,
      subscriptionId: subscription.id,
      planLabel: SINGLE_PLAN.name,
      basePaise: lockedPricePaise,
      customerName: profile?.full_name ?? email,
      customerEmail: email,
      customerGstin: profile?.gstin,
      customerBusinessName: profile?.business_name,
    }).catch((err) => console.error("Webhook invoice error:", err))
  }

  sendPaymentConfirmationEmail({
    to: email,
    name: profile?.full_name ?? undefined,
    planLabel: SINGLE_PLAN.name,
    amount: `₹${(lockedPricePaise / 100).toFixed(2)}`,
  }).catch((err) => console.error("Payment confirmation email error:", err))

  return NextResponse.json({
    message: "Subscription activated",
    planName: SINGLE_PLAN.name,
    tier: SINGLE_TIER,
  })
}

// =============================================
// Subscription charged: renewal
// =============================================

async function handleSubscriptionCharged(
  event: Record<string, unknown>,
  adminClient: ReturnType<typeof createAdminClient>
) {
  const payload = event.payload as Record<string, unknown>

  const subEntity = (payload?.subscription as Record<string, unknown>)
    ?.entity as Record<string, unknown>

  if (!subEntity) {
    return NextResponse.json(
      { error: "Missing subscription data" },
      { status: 400 }
    )
  }

  const rzpSubscriptionId = subEntity.id as string

  const { data: subscription } = await adminClient
    .from("subscriptions")
    .select(
      "id, user_id, plan_label, base_amount_paise, locked_price_paise"
    )
    .eq("razorpay_subscription_id", rzpSubscriptionId)
    .maybeSingle()

  if (!subscription) {
    console.error(
      "Webhook subscription.charged: no subscription found for",
      rzpSubscriptionId
    )

    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
    )
  }

  const newExpiry = new Date()
  newExpiry.setDate(newExpiry.getDate() + SINGLE_PLAN.durationDays)

  await adminClient
    .from("subscriptions")
    .update({
      expires_at: newExpiry.toISOString(),
      status: "active",
      recurring_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id)

  const renewalPaise =
    subscription.locked_price_paise ??
    subscription.base_amount_paise ??
    SINGLE_PLAN.amountPaise

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, gstin, business_name")
    .eq("user_id", subscription.user_id)
    .single()

  const { data: userData } = await adminClient.auth.admin.getUserById(
    subscription.user_id
  )

  generateInvoice({
    userId: subscription.user_id,
    subscriptionId: subscription.id,
    planLabel: subscription.plan_label ?? SINGLE_PLAN.name,
    basePaise: renewalPaise,
    customerName: profile?.full_name ?? "Customer",
    customerEmail: userData?.user?.email ?? "",
    customerGstin: profile?.gstin,
    customerBusinessName: profile?.business_name,
  }).catch((err) => console.error("Webhook renewal invoice error:", err))

  if (userData?.user?.email) {
    sendPaymentConfirmationEmail({
      to: userData.user.email,
      name: profile?.full_name ?? undefined,
      planLabel: subscription.plan_label ?? SINGLE_PLAN.name,
      amount: `₹${(renewalPaise / 100).toFixed(2)}`,
    }).catch((err) => console.error("Renewal email error:", err))
  }

  return NextResponse.json({ message: "Subscription renewed" })
}

// =============================================
// Subscription cancelled
// =============================================

async function handleSubscriptionStatusChange(
  event: Record<string, unknown>,
  adminClient: ReturnType<typeof createAdminClient>,
  newStatus: "cancelled" | "completed"
) {
  const payload = event.payload as Record<string, unknown>

  const subEntity = (payload?.subscription as Record<string, unknown>)
    ?.entity as Record<string, unknown>

  if (!subEntity) {
    return NextResponse.json(
      { error: "Missing subscription data" },
      { status: 400 }
    )
  }

  const rzpSubscriptionId = subEntity.id as string

  await adminClient
    .from("subscriptions")
    .update({
      recurring_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_subscription_id", rzpSubscriptionId)

  return NextResponse.json({ message: `Subscription ${newStatus}` })
}

// =============================================
// Subscription completed
// =============================================

async function handleSubscriptionCompleted(
  event: Record<string, unknown>,
  adminClient: ReturnType<typeof createAdminClient>
) {
  const payload = event.payload as Record<string, unknown>

  const subEntity = (payload?.subscription as Record<string, unknown>)
    ?.entity as Record<string, unknown>

  if (!subEntity) {
    return NextResponse.json(
      { error: "Missing subscription data" },
      { status: 400 }
    )
  }

  const rzpSubscriptionId = subEntity.id as string

  await adminClient
    .from("subscriptions")
    .update({
      status: "cancelled",
      recurring_status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_subscription_id", rzpSubscriptionId)

  return NextResponse.json({ message: "Subscription completed" })
}