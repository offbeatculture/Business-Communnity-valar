import { createAdminClient } from "@/lib/supabase/admin"
import { createMagicLoginToken } from "@/lib/magic-link"
import { sendMagicLinkEmail } from "@/lib/ses"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// Statuses that indicate the user has paid or is eligible for recovery
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

/**
 * Shared recovery logic used by:
 * - /api/onboarding/recover-account (by email, sends email)
 * - /api/onboarding/open-account (by sessionId, returns redirect URL)
 * - /api/auth/magic-link/resend (by email, sends email)
 */
export async function recoverAccount(input: RecoveryInput): Promise<RecoveryResult> {
  const supabase = createAdminClient()

  // Step 1: Find onboarding session
  let session: Record<string, unknown> | null = null

  if (input.type === "email") {
    const normalizedEmail = input.email.toLowerCase().trim()

    // Find latest recoverable session by email
    const { data } = await supabase
      .from("onboarding_sessions")
      .select("*")
      .eq("email", normalizedEmail)
      .in("status", RECOVERABLE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    session = data
  } else {
    const { data } = await supabase
      .from("onboarding_sessions")
      .select("*")
      .eq("id", input.sessionId)
      .single()

    session = data
  }

  if (!session) {
    // Safe message — don't reveal whether account exists
    return {
      success: true,
      message: "If we found an active paid account, we've sent a fresh access link to your email.",
    }
  }

  const email = (session.email as string)?.toLowerCase().trim()
  if (!email) {
    return { success: false, error: "No email associated with this session." }
  }

  // Step 2: Confirm recoverable state
  const sessionStatus = session.status as string
  const rzpSubscriptionId = session.razorpay_subscription_id as string | null

  const isRecoverableByStatus = RECOVERABLE_STATUSES.includes(sessionStatus)

  // Also check if there's an active subscription in the subscriptions table
  let hasActiveSubscription = false
  if (rzpSubscriptionId) {
    const { data: activeSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("razorpay_subscription_id", rzpSubscriptionId)
      .eq("status", "active")
      .limit(1)
      .single()

    hasActiveSubscription = !!activeSub
  }

  // For sessionId-based recovery, also accept "paid" status even without subscription row yet
  // (webhook may not have fired yet)
const isEligible =
  isRecoverableByStatus || hasActiveSubscription

  if (!isEligible) {
    if (input.type === "email") {
      // Safe message
      return {
        success: true,
        message: "If we found an active paid account, we've sent a fresh access link to your email.",
      }
    }
    return { success: false, error: "This session is not eligible for account recovery." }
  }

  // Step 3: Find or create auth user
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  let user = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email
  )

  if (!user) {
    console.log(`[recovery] Creating auth user for ${email}`)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { password_set: false },
    })

    if (createError) {
      console.error("[recovery] Failed to create user:", createError.message)
      return { success: false, error: "Failed to create account. Please try again." }
    }

    user = newUser.user
  }

  if (!user) {
    return { success: false, error: "Unable to locate or create account." }
  }

  // Step 4: Create/repair subscription if needed
  if (rzpSubscriptionId && !hasActiveSubscription) {
    // Check if any subscription exists for this rzp subscription id (any status)
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("razorpay_subscription_id", rzpSubscriptionId)
      .limit(1)
      .single()

    if (!existingSub) {
      // Also check user doesn't already have an active sub from another source
      const { data: userActiveSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .single()

      if (!userActiveSub) {
        console.log(`[recovery] Creating subscription row for user ${user.id}, rzp_sub ${rzpSubscriptionId}`)
        const startsAt = new Date()
        const expiresAt = new Date(startsAt)
        expiresAt.setDate(expiresAt.getDate() + 30)

        await supabase.from("subscriptions").insert({
          user_id: user.id,
          razorpay_subscription_id: rzpSubscriptionId,
          plan_name: "monthly",
          plan_label: "Monthly Subscription",
          base_amount_paise: 49900,
          amount_paid: 49900,
          currency: "INR",
          status: "active",
          recurring_status: "active",
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
      }
    }
  }

  // Step 5: Update onboarding session
  const updateFields: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }

  if (!RECOVERABLE_STATUSES.includes(sessionStatus)) {
    updateFields.status = "user_created"
  }

  // Step 6: Generate magic token
  const rawToken = await createMagicLoginToken(user.id)
  const magicUrl = `${APP_URL}/auth/magic?token=${rawToken}`

  // Step 7: Send email or return redirect URL
  if (input.sendEmail) {
    try {
      await sendMagicLinkEmail({ to: email, token: rawToken })
      updateFields.login_link_sent_at = new Date().toISOString()
      updateFields.last_email_error = null
      console.log(`[recovery] Magic link email sent to ${email}`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      updateFields.last_email_error = errorMsg
      console.error(`[recovery] Failed to send magic link email to ${email}:`, errorMsg)
    }
  }

  // Persist session updates
  await supabase
    .from("onboarding_sessions")
    .update(updateFields)
    .eq("id", session.id as string)

  if (input.sendEmail) {
    return {
      success: true,
      message: "If we found an active paid account, we've sent a fresh access link to your email.",
    }
  }

  return {
    success: true,
    message: "Account ready. Redirecting...",
    redirectUrl: magicUrl,
  }
}
