import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateInvoice } from "@/lib/invoice"
import { createMagicLoginToken } from "@/lib/magic-link"
import { sendMagicLinkEmail, sendPaymentConfirmationEmail } from "@/lib/ses"
import { createSubscription, fetchSubscription,fetchPlanDetails } from "@/lib/razorpay-subscriptions"

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

  // Skip quietly for new subscription flow — user_id won't exist for new onboarding payments
  if (!userId) {
    return NextResponse.json({ message: "Skipped — new subscription flow" })
  }

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
    const { data } = await adminClient
      .from("onboarding_sessions")
      .select("*")
      .eq("razorpay_subscription_id", rzpSubscriptionId)
      .single()
    session = data
  }

  // ✅ Read plan details from session — saved by create-subscription using real Razorpay plan data
  // session.amount_paid = actual amount in paise from Razorpay plan (e.g. 129900 for Workshop)
  // session.tier = plan label from Razorpay plan name (e.g. "Workshop")
  // session.selected_tier = tier key selected by user (e.g. "workshop")

    // Fetch the subscription details to get the actual amount
      const subscriptionDetails = await fetchSubscription(rzpSubscriptionId)
  
      // Fetch the plan details using the plan_id from the subscription
      const planDetails = await fetchPlanDetails(subscriptionDetails.plan_id)


  const planAmount = planDetails.item.amount
  const planLabel = "monthly"
  const tier = planDetails.item.name

  // Check if user already exists
  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  let user = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (!user) {
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
    if (session) {
      await adminClient
        .from("onboarding_sessions")
        .update({
          status: "completed",
          user_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
    }
    return NextResponse.json({ message: "User already has active subscription" })
  }

  const startsAt = new Date()
  const expiresAt = new Date(startsAt)
  expiresAt.setDate(expiresAt.getDate() + 30)

  // ✅ Insert with real plan details fetched from Razorpay — not hardcoded
  const { data: subscription } = await adminClient
    .from("subscriptions")
    .insert({
      user_id: user.id,
      razorpay_subscription_id: rzpSubscriptionId,
      plan_name: tier,
      plan_label: planLabel,
      base_amount_paise: planAmount,
      amount_paid: planAmount,
      currency: "DIR",
      status: "active",
      recurring_status: "active",
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single()
    
console.log("Inserted subscription data:", subscription);
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

  // // Generate invoice
  // if (subscription) {
  //   const { data: profile } = await adminClient
  //     .from("profiles")
  //     .select("full_name, gstin, business_name")
  //     .eq("user_id", user.id)
  //     .single()

  //   generateInvoice({
  //     userId: user.id,
  //     subscriptionId: subscription.id,
  //     planLabel: planLabel,
  //     basePaise: planAmount,
  //     customerName: profile?.full_name ?? email,
  //     customerEmail: email,
  //     customerGstin: profile?.gstin,
  //     customerBusinessName: profile?.business_name,
  //   }).catch((err) => console.error("Webhook invoice error:", err))
  // }

  // Send payment confirmation email
  // sendPaymentConfirmationEmail({
  //   to: email,
  //   planLabel: planLabel,
  //   amount: `₹${(planAmount / 100).toFixed(2)} + 18% GST`,
  // }).catch((err) => console.error("Payment confirmation email error:", err))

  // return NextResponse.json({ message: "Subscription activated, user created" })
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

  if (!subEntity) {
    return NextResponse.json({ error: "Missing subscription data" }, { status: 400 })
  }

  const rzpSubscriptionId = subEntity.id as string

  const { data: subscription } = await adminClient
    .from("subscriptions")
    .select("id, user_id, plan_label, base_amount_paise")
    .eq("razorpay_subscription_id", rzpSubscriptionId)
    .single()

  if (!subscription) {
    console.error("Webhook subscription.charged: no subscription found for", rzpSubscriptionId)
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
  }

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