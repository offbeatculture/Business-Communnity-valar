import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateInvoice } from "@/lib/invoice"
import { createMagicLoginToken } from "@/lib/magic-link"
import { sendMagicLinkEmail, sendPaymentConfirmationEmail } from "@/lib/ses"

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
    const eventType = event.event as string

    const adminClient = createAdminClient()

    // Idempotency check via webhook_events table
    const razorpayEventId =
      event.payload?.subscription?.entity?.id
        ? `${eventType}:${event.payload.subscription.entity.id}:${Date.now()}`
        : event.payload?.payment?.entity?.id
          ? `${eventType}:${event.payload.payment.entity.id}`
          : `${eventType}:${Date.now()}`

    // For subscription events, use subscription_id + event for dedup
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
      // Unique constraint violation — already processed
      return NextResponse.json({ message: "Already processed" })
    }

    // Route to appropriate handler
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
        return handleSubscriptionStatusChange(event, adminClient, "completed")

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
// OLD FLOW: One-time payment backup (preserved)
// =============================================

async function handlePaymentCaptured(
  event: Record<string, unknown>,
  adminClient: ReturnType<typeof createAdminClient>
) {
  const payment = (event.payload as Record<string, unknown>)?.payment as Record<string, unknown>
  const entity = payment?.entity as Record<string, unknown>
  if (!entity) {
    return NextResponse.json({ error: "Missing payment data" }, { status: 400 })
  }

  const notes = (entity.notes ?? {}) as Record<string, string>
  const userId = notes.user_id
  const planId = notes.plan_id ?? "monthly"
  const planLabel = notes.plan_label ?? "Subscription"
  const baseAmount = parseInt(notes.base_amount ?? "0", 10)
  const durationDays = parseInt(notes.duration_days ?? "30", 10)

  if (!userId) {
    console.error("Webhook payment.captured: missing user_id in notes")
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 })
  }

  // Idempotency: check if subscription already exists for this payment
  const { data: existing } = await adminClient
    .from("subscriptions")
    .select("id")
    .eq("razorpay_payment_id", entity.id as string)
    .single()

  if (existing) {
    return NextResponse.json({ message: "Already processed" })
  }

  const startsAt = new Date()
  const expiresAt = new Date(startsAt)
  expiresAt.setDate(expiresAt.getDate() + durationDays)

  const { data: subscription } = await adminClient
    .from("subscriptions")
    .insert({
      user_id: userId,
      razorpay_payment_id: entity.id as string,
      razorpay_order_id: entity.order_id as string,
      plan_name: planId,
      plan_label: planLabel,
      base_amount_paise: baseAmount,
      amount_paid: entity.amount as number,
      currency: (entity.currency as string) ?? "INR",
      status: "active",
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single()

  // Generate invoice
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
      customerEmail: (entity.email as string) ?? "",
      customerGstin: profile?.gstin,
      customerBusinessName: profile?.business_name,
    }).catch((err) => console.error("Webhook invoice error:", err))
  }

  return NextResponse.json({ message: "Payment recorded" })
}

// =============================================
// NEW FLOW: Subscription activated (user creation)
// =============================================

async function handleSubscriptionActivated(
  event: Record<string, unknown>,
  adminClient: ReturnType<typeof createAdminClient>
) {
  const payload = event.payload as Record<string, unknown>
  const subEntity = (payload?.subscription as Record<string, unknown>)?.entity as Record<string, unknown>
  if (!subEntity) {
    return NextResponse.json({ error: "Missing subscription data" }, { status: 400 })
  }

  const rzpSubscriptionId = subEntity.id as string
  const notes = (subEntity.notes ?? {}) as Record<string, string>
  const sessionId = notes.onboarding_session_id
  const email = notes.email

  if (!email) {
    console.error("Webhook subscription.activated: missing email in notes")
    return NextResponse.json({ error: "Missing email" }, { status: 400 })
  }

  // Find onboarding session
  let session = null
  if (sessionId) {
    const { data } = await adminClient
      .from("onboarding_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()
    session = data
  }

  if (!session) {
    // Fallback: find by subscription ID
    const { data } = await adminClient
      .from("onboarding_sessions")
      .select("*")
      .eq("razorpay_subscription_id", rzpSubscriptionId)
      .single()
    session = data
  }

  // Check if user already exists
  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  let user = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (!user) {
    // Create new Supabase user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { password_set: false },
    })

    if (createError) {
      console.error("Failed to create user:", createError)
      return NextResponse.json({ error: "User creation failed" }, { status: 500 })
    }

    user = newUser.user
  }

  if (!user) {
    return NextResponse.json({ error: "User not found or created" }, { status: 500 })
  }

  // Check for existing active subscription (prevent duplicates)
  const { data: existingSub } = await adminClient
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  if (existingSub) {
    // Update session and return — user already has an active sub
    if (session) {
      await adminClient
        .from("onboarding_sessions")
        .update({ status: "completed", user_id: user.id, updated_at: new Date().toISOString() })
        .eq("id", session.id)
    }
    return NextResponse.json({ message: "User already has active subscription" })
  }

  // Create subscription record
  const planAmount = (subEntity.plan_amount as number) ?? 49900
  const startsAt = new Date()
  const expiresAt = new Date(startsAt)
  expiresAt.setDate(expiresAt.getDate() + 30)

  const { data: subscription } = await adminClient
    .from("subscriptions")
    .insert({
      user_id: user.id,
      razorpay_subscription_id: rzpSubscriptionId,
      plan_name: "monthly",
      plan_label: "Monthly Subscription",
      base_amount_paise: planAmount,
      amount_paid: planAmount,
      currency: "INR",
      status: "active",
      recurring_status: "active",
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single()

  // Update onboarding session
  if (session) {
    await adminClient
      .from("onboarding_sessions")
      .update({
        status: "user_created",
        user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)
  }

  // Generate magic login token and send email
  try {
    const rawToken = await createMagicLoginToken(user.id)
    await sendMagicLinkEmail({ to: email, token: rawToken })
  } catch (err) {
    console.error("Failed to send magic link email:", err)
  }

  // Generate invoice
  if (subscription) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, gstin, business_name")
      .eq("user_id", user.id)
      .single()

    generateInvoice({
      userId: user.id,
      subscriptionId: subscription.id,
      planLabel: "Monthly Subscription",
      basePaise: planAmount,
      customerName: profile?.full_name ?? email,
      customerEmail: email,
      customerGstin: profile?.gstin,
      customerBusinessName: profile?.business_name,
    }).catch((err) => console.error("Webhook invoice error:", err))
  }

  // Send payment confirmation email
  sendPaymentConfirmationEmail({
    to: email,
    planLabel: "Monthly Subscription",
    amount: `₹${(planAmount / 100).toFixed(2)} + 18% GST`,
  }).catch((err) => console.error("Payment confirmation email error:", err))

  return NextResponse.json({ message: "Subscription activated, user created" })
}

// =============================================
// NEW FLOW: Subscription charged (renewal)
// =============================================

async function handleSubscriptionCharged(
  event: Record<string, unknown>,
  adminClient: ReturnType<typeof createAdminClient>
) {
  const payload = event.payload as Record<string, unknown>
  const subEntity = (payload?.subscription as Record<string, unknown>)?.entity as Record<string, unknown>
  const paymentEntity = (payload?.payment as Record<string, unknown>)?.entity as Record<string, unknown>

  if (!subEntity) {
    return NextResponse.json({ error: "Missing subscription data" }, { status: 400 })
  }

  const rzpSubscriptionId = subEntity.id as string

  // Find existing subscription
  const { data: subscription } = await adminClient
    .from("subscriptions")
    .select("id, user_id, plan_label, base_amount_paise")
    .eq("razorpay_subscription_id", rzpSubscriptionId)
    .single()

  if (!subscription) {
    console.error("Webhook subscription.charged: no subscription found for", rzpSubscriptionId)
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
  }

  // Extend expiry by 30 days from now
  const newExpiry = new Date()
  newExpiry.setDate(newExpiry.getDate() + 30)

  await adminClient
    .from("subscriptions")
    .update({
      expires_at: newExpiry.toISOString(),
      status: "active",
      recurring_status: "active",
    })
    .eq("id", subscription.id)

  // Generate invoice for this charge
  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, gstin, business_name")
    .eq("user_id", subscription.user_id)
    .single()

  const { data: userData } = await adminClient.auth.admin.getUserById(subscription.user_id)

  generateInvoice({
    userId: subscription.user_id,
    subscriptionId: subscription.id,
    planLabel: subscription.plan_label ?? "Monthly Subscription",
    basePaise: subscription.base_amount_paise ?? 49900,
    customerName: profile?.full_name ?? "Customer",
    customerEmail: userData?.user?.email ?? "",
    customerGstin: profile?.gstin,
    customerBusinessName: profile?.business_name,
  }).catch((err) => console.error("Webhook renewal invoice error:", err))

  // Send payment confirmation
  if (userData?.user?.email) {
    sendPaymentConfirmationEmail({
      to: userData.user.email,
      name: profile?.full_name ?? undefined,
      planLabel: subscription.plan_label ?? "Monthly Subscription",
      amount: `₹${((subscription.base_amount_paise ?? 49900) / 100).toFixed(2)} + 18% GST`,
    }).catch((err) => console.error("Renewal email error:", err))
  }

  return NextResponse.json({ message: "Subscription renewed" })
}

// =============================================
// NEW FLOW: Subscription cancelled / completed
// =============================================

async function handleSubscriptionStatusChange(
  event: Record<string, unknown>,
  adminClient: ReturnType<typeof createAdminClient>,
  newStatus: "cancelled" | "completed"
) {
  const payload = event.payload as Record<string, unknown>
  const subEntity = (payload?.subscription as Record<string, unknown>)?.entity as Record<string, unknown>

  if (!subEntity) {
    return NextResponse.json({ error: "Missing subscription data" }, { status: 400 })
  }

  const rzpSubscriptionId = subEntity.id as string

  await adminClient
    .from("subscriptions")
    .update({ recurring_status: newStatus })
    .eq("razorpay_subscription_id", rzpSubscriptionId)

  return NextResponse.json({ message: `Subscription ${newStatus}` })
}
