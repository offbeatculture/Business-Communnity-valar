import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateInvoice } from "@/lib/invoice"
import { createMagicLoginToken } from "@/lib/magic-link"
import { sendMagicLinkEmail, sendPaymentConfirmationEmail } from "@/lib/ses"
import {
  getTierBand,
  getTierLabel,
  getTierRank,
  type ProductTier,
} from "@/lib/plans"

// =============================================================================
// Tier helpers — shared by activation and one-time payment handlers.
//
// Phase 2A: replaces the hardcoded `49900` price fallback with a band-derived
// price so subscription rows always carry a sensible `locked_price_paise`
// even if Razorpay omits `plan_amount` from the webhook payload.
// =============================================================================

function isProductTier(value: unknown): value is ProductTier {
  return value === "library" || value === "workshop" || value === "ai_lab"
}

/**
 * Counts active, non-expired subscriptions. Used to determine which milestone
 * band a new subscription falls into. Errors are swallowed and 0 is returned
 * — better to put new signups in the founding band than to fail the webhook.
 */
async function countActiveSubscriptions(
  adminClient: ReturnType<typeof createAdminClient>,
): Promise<number> {
  const { count, error } = await adminClient
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())

  if (error) {
    console.error("Failed to count active subscriptions:", error)
    return 0
  }
  return count ?? 0
}

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
  // Tier comes from order notes (set by create-order). Default 'library' for
  // legacy one-time payments that pre-date the three-tier system.
  const tier: ProductTier = isProductTier(notes.tier) ? notes.tier : "library"

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

  // Tier-aware fields. baseAmount is the pre-GST base in paise, recorded by
  // create-order from `getCurrentlySellingTiers`. If it's missing/zero we fall
  // back to the band's monthly price (no more hardcoded ₹499 fallback).
  const activeCount = await countActiveSubscriptions(adminClient)
  const band = getTierBand(tier, activeCount)
  const lockedPricePaise = baseAmount > 0 ? baseAmount : band.monthlyPaise

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
      tier,
      tier_rank: getTierRank(tier),
      locked_price_paise: lockedPricePaise,
      band_at_signup: band.band,
      // No razorpay_plan_id for one-time payments — they don't bind to a plan.
      razorpay_plan_id: null,
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

  // Tier resolution. The new `createSubscription()` writes `tier` into Razorpay
  // notes; legacy subscriptions activating mid-deploy may omit it, in which
  // case we default to 'library' so the legacy single-tier flow keeps working.
  const tier: ProductTier = isProductTier(notes.tier) ? notes.tier : "library"
  const tierRank = getTierRank(tier)
  const tierLabel = getTierLabel(tier)

  // Band derivation: the band the user is signing up in is determined by the
  // currently-selling band for their tier (NOT the count of users already at
  // that tier — bands are global, per the locked plan in plans.ts).
  const activeCount = await countActiveSubscriptions(adminClient)
  const band = getTierBand(tier, activeCount)

  // Price lock: prefer Razorpay's `plan_amount` (paise, pre-GST). When absent
  // (occasional Razorpay quirk on activation events), fall back to the band's
  // monthly price — this replaces the old hardcoded `49900` fallback.
  const planAmountFromRazorpay =
    typeof subEntity.plan_amount === "number" ? subEntity.plan_amount : null
  const lockedPricePaise = planAmountFromRazorpay ?? band.monthlyPaise

  // Bind the subscription row to the Razorpay plan it was created against so
  // tier changes can compare current plan vs requested plan in Phase 5.
  const razorpayPlanId =
    typeof subEntity.plan_id === "string" ? subEntity.plan_id : null

  const startsAt = new Date()
  const expiresAt = new Date(startsAt)
  expiresAt.setDate(expiresAt.getDate() + 30)

  const planLabel = `${tierLabel} — Monthly`

  const { data: subscription } = await adminClient
    .from("subscriptions")
    .insert({
      user_id: user.id,
      razorpay_subscription_id: rzpSubscriptionId,
      plan_name: `${tier}_monthly`,
      plan_label: planLabel,
      base_amount_paise: lockedPricePaise,
      amount_paid: lockedPricePaise,
      currency: "INR",
      status: "active",
      recurring_status: "active",
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      tier,
      tier_rank: tierRank,
      locked_price_paise: lockedPricePaise,
      band_at_signup: band.band,
      razorpay_plan_id: razorpayPlanId,
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
      planLabel,
      basePaise: lockedPricePaise,
      customerName: profile?.full_name ?? email,
      customerEmail: email,
      customerGstin: profile?.gstin,
      customerBusinessName: profile?.business_name,
    }).catch((err) => console.error("Webhook invoice error:", err))
  }

  // Send payment confirmation email
  sendPaymentConfirmationEmail({
    to: email,
    planLabel,
    amount: `₹${(lockedPricePaise / 100).toFixed(2)} + 18% GST`,
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

  // Find existing subscription. We pull tier metadata so we can fall back to
  // the locked price when generating the renewal invoice — but we MUST NOT
  // rewrite tier columns on renewal. Locked price stays locked (D4).
  const { data: subscription } = await adminClient
    .from("subscriptions")
    .select("id, user_id, plan_label, base_amount_paise, tier, locked_price_paise")
    .eq("razorpay_subscription_id", rzpSubscriptionId)
    .single()

  if (!subscription) {
    console.error("Webhook subscription.charged: no subscription found for", rzpSubscriptionId)
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
  }

  // Extend expiry by 30 days from now. IMPORTANT: do NOT touch tier,
  // tier_rank, locked_price_paise, band_at_signup, or razorpay_plan_id here —
  // those are immutable across renewals. Only the billing window moves.
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

  // Resolve the canonical price for invoicing: locked_price_paise (the
  // founding price the member signed up at) takes precedence, then the older
  // base_amount_paise column, then a defensive zero (better than misreporting).
  const renewalPaise =
    subscription.locked_price_paise ??
    subscription.base_amount_paise ??
    0

  const renewalLabel = subscription.plan_label ?? "Monthly Subscription"

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
    planLabel: renewalLabel,
    basePaise: renewalPaise,
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
      planLabel: renewalLabel,
      amount: `₹${(renewalPaise / 100).toFixed(2)} + 18% GST`,
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
