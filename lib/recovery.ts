import { createAdminClient } from "@/lib/supabase/admin"
import { createMagicLoginToken } from "@/lib/magic-link"
import { sendMagicLinkEmail } from "@/lib/ses"
import { SINGLE_PLAN } from "@/lib/plans"

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000"

const RECOVERABLE_STATUSES = ["paid", "user_created", "completed"]

export type RecoveryResult = {
  success: boolean
  message?: string
  redirectUrl?: string
  error?: string
}

type RecoveryInput =
  | { type: "email"; email: string; sendEmail: true }
  | { type: "sessionId"; sessionId: string; sendEmail: false }

export async function recoverAccount(
  input: RecoveryInput
): Promise<RecoveryResult> {
  const supabase = createAdminClient()

  let session: Record<string, unknown> | null = null

  if (input.type === "email") {
    const normalizedEmail = input.email.toLowerCase().trim()

    const { data } = await supabase
      .from("onboarding_sessions")
      .select("*")
      .eq("email", normalizedEmail)
      .in("status", RECOVERABLE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    session = data
  } else {
    const { data } = await supabase
      .from("onboarding_sessions")
      .select("*")
      .eq("id", input.sessionId)
      .maybeSingle()

    session = data
  }

  if (!session) {
    return {
      success: true,
      message:
        "If we found an active paid account, we've sent a fresh access link to your email.",
    }
  }

  const email = (session.email as string)?.toLowerCase().trim()

  if (!email) {
    return {
      success: false,
      error: "No email associated with this session.",
    }
  }

  const sessionStatus = session.status as string
  const rzpSubscriptionId =
    (session.razorpay_subscription_id as string | null) ?? null

  const isRecoverableByStatus = RECOVERABLE_STATUSES.includes(sessionStatus)

  let hasActiveSubscription = false

  if (rzpSubscriptionId) {
    const { data: activeSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("razorpay_subscription_id", rzpSubscriptionId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    hasActiveSubscription = !!activeSub
  }

  const isEligible = isRecoverableByStatus || hasActiveSubscription

  if (!isEligible) {
    if (input.type === "email") {
      return {
        success: true,
        message:
          "If we found an active paid account, we've sent a fresh access link to your email.",
      }
    }

    return {
      success: false,
      error: "This session is not eligible for account recovery.",
    }
  }

  const { data: existingUsers } = await supabase.auth.admin.listUsers()

  let user = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email
  )

  if (!user) {
    console.log(`[recovery] Creating auth user for ${email}`)

    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          password_set: false,
        },
      })

    if (createError) {
      console.error("[recovery] Failed to create user:", createError.message)

      return {
        success: false,
        error: "Failed to create account. Please try again.",
      }
    }

    user = newUser.user
  }

  if (!user) {
    return {
      success: false,
      error: "Unable to locate or create account.",
    }
  }

  if (rzpSubscriptionId && !hasActiveSubscription) {
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("razorpay_subscription_id", rzpSubscriptionId)
      .limit(1)
      .maybeSingle()

    if (!existingSub) {
      const { data: userActiveSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle()

      if (!userActiveSub) {
        console.log(
          `[recovery] Creating subscription row for user ${user.id}, rzp_sub ${rzpSubscriptionId}`
        )

        const startsAt = new Date()
        const expiresAt = new Date(startsAt)

        expiresAt.setDate(expiresAt.getDate() + SINGLE_PLAN.durationDays)

        const { error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,

            razorpay_subscription_id: rzpSubscriptionId,
            razorpay_payment_id: null,
            razorpay_order_id: null,
            razorpay_plan_id: process.env.RAZORPAY_PLAN_ID_MONTHLY ?? null,

            plan_id: SINGLE_PLAN.id,
            plan_name: SINGLE_PLAN.name,
            plan_label: SINGLE_PLAN.name,

            base_amount_paise: SINGLE_PLAN.amountPaise,
            amount_paid: SINGLE_PLAN.amountPaise,
            amount_paise: SINGLE_PLAN.amountPaise,
            locked_price_paise: SINGLE_PLAN.amountPaise,

            currency: "INR",
            status: "active",
            recurring_status: "active",

            tier: "membership",
            tier_rank: 1,
            band_at_signup: "membership",

            starts_at: startsAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (insertError) {
          console.error("[recovery] Subscription insert error:", insertError)

          return {
            success: false,
            error: "Failed to create membership access.",
          }
        }
      }
    }
  }

  const updateFields: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }

  if (!RECOVERABLE_STATUSES.includes(sessionStatus)) {
    updateFields.status = "user_created"
  }

  const rawToken = await createMagicLoginToken(user.id)
  const magicUrl = `${APP_URL}/auth/magic?token=${rawToken}`

  if (input.sendEmail) {
    try {
      await sendMagicLinkEmail({
        to: email,
        token: rawToken,
      })

      updateFields.login_link_sent_at = new Date().toISOString()
      updateFields.last_email_error = null

      console.log(`[recovery] Magic link email sent to ${email}`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"

      updateFields.last_email_error = errorMsg

      console.error(
        `[recovery] Failed to send magic link email to ${email}:`,
        errorMsg
      )
    }
  }

  await supabase
    .from("onboarding_sessions")
    .update(updateFields)
    .eq("id", session.id as string)

  if (input.sendEmail) {
    return {
      success: true,
      message:
        "If we found an active paid account, we've sent a fresh access link to your email.",
    }
  }

  return {
    success: true,
    message: "Account ready. Redirecting...",
    redirectUrl: magicUrl,
  }
}