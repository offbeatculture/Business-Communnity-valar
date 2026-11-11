import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin, logAdminAction } from "@/lib/admin-audit"
import { createMagicLoginToken } from "@/lib/magic-link"
import { sendMagicLinkEmail } from "@/lib/ses"
import { SINGLE_PLAN, formatINR } from "@/lib/plans"
import { karmaRecodeExpiry } from "@/lib/karma-recode-dates"
import { syncKarmaRecodeMembership } from "@/lib/karma-recode-admin"

const schema = z.object({
  email: z.string().email().max(255),
  full_name: z.string().min(1).max(120),
  // 0 = create the account with no access, for someone who will pay later.
  access_days: z.number().int().min(0).max(3650).default(30),
  send_login: z.boolean().default(true),
  note: z.string().max(500).optional(),
  // Optional. Set it and the member can sign in immediately with these
  // details; leave it out and they arrive through the magic link and choose
  // their own. 72 is bcrypt's ceiling — anything longer is silently truncated.
  password: z.string().min(8).max(72).optional(),
  // The rate this member is locked into, in whole rupees per month. Stored
  // against the subscription as locked_price_paise, which is preserved for the
  // life of the membership even when list pricing moves.
  locked_price_rupees: z.number().int().min(0).max(1_000_000).optional(),
  // Karma Recode buyer: Lifinity plus the Karma Recode tab for a year from
  // purchase (from 1 June 2026 if bought earlier). Replaces access_days.
  karma_recode: z.boolean().default(false),
  karma_recode_purchased_on: z.iso.date().optional(),
  phone: z.string().trim().max(30).optional(),
})

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const {
      email,
      full_name,
      access_days,
      send_login,
      note,
      password,
      locked_price_rupees,
      karma_recode,
      karma_recode_purchased_on,
      phone,
    } = parsed.data

    const admin = createAdminClient()

    // Fall back to the current list price rather than 0, so a member created
    // without an explicit rate is not silently recorded as paying nothing.
    const lockedPricePaise =
      locked_price_rupees !== undefined
        ? locked_price_rupees * 100
        : SINGLE_PLAN.amountPaise

    // Check for an existing account FIRST. Calling createUser blind would
    // hit a duplicate-email error and leave the admin guessing whether
    // anything happened.
    const { data: existingId } = await admin.rpc("get_user_id_by_email", {
      p_email: email,
    })

    if (existingId) {
      return NextResponse.json(
        {
          error: karma_recode
            ? "An account with that email already exists. Add them under Members → Karma Recode instead."
            : "An account with that email already exists.",
          existingUserId: existingId,
        },
        { status: 409 },
      )
    }

    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name },
        ...(password ? { password } : {}),
      })

    if (createErr || !created?.user) {
      console.error("createUser failed:", createErr)
      return NextResponse.json(
        { error: createErr?.message ?? "Could not create the account" },
        { status: 500 },
      )
    }

    const userId = created.user.id

    // A trigger creates the profile row (003_auth_trigger). Fill in the
    // name, and upsert so this still works if the trigger is ever removed.
    // password_set drives the /set-password redirect in middleware. An admin
    // who typed a password has already chosen one, so marking it true keeps the
    // member from being sent to pick another on first sign-in.
    const { data: profile } = await admin
      .from("profiles")
      .upsert(
        { user_id: userId, full_name, ...(password ? { password_set: true } : {}) },
        { onConflict: "user_id" },
      )
      .select("id")
      .single()

    // Karma Recode: ticked on the form, or already on the Karma Recode list
    // (bought before they had an account). Either way their access runs for
    // their Karma Recode year instead of the access days.
    const krEmail = email.trim().toLowerCase()
    let krExpiresAt: string | null = null
    if (karma_recode) {
      krExpiresAt = karmaRecodeExpiry(karma_recode_purchased_on ?? null)
      const { error: krError } = await admin.from("karma_recode_members").upsert({
        email: krEmail,
        name: full_name,
        phone: phone || null,
        purchased_on: karma_recode_purchased_on ?? null,
        expires_at: krExpiresAt,
      })
      if (krError) {
        return NextResponse.json(
          {
            error: `${full_name} was created, but couldn't be added to Karma Recode: ${krError.message}`,
            profileId: profile?.id ?? null,
          },
          { status: 500 },
        )
      }
    } else {
      const { data: listed } = await admin
        .from("karma_recode_members")
        .select("expires_at")
        .eq("email", krEmail)
        .maybeSingle()
      krExpiresAt = (listed?.expires_at as string | undefined) ?? null
    }

    if (krExpiresAt) {
      try {
        await syncKarmaRecodeMembership(userId, krExpiresAt)
      } catch (err) {
        return NextResponse.json(
          {
            error: `${full_name} was created and is on Karma Recode, but their membership couldn't be set up: ${err instanceof Error ? err.message : err}`,
            profileId: profile?.id ?? null,
          },
          { status: 500 },
        )
      }
    } else if (access_days > 0) {
      const expiresAt = new Date(Date.now() + access_days * 86_400_000)

      const { error: subError } = await admin.from("subscriptions").insert({
        user_id: userId,
        plan_name: SINGLE_PLAN.name,
        plan_label: SINGLE_PLAN.label,
        // Nothing was collected through a gateway here, so amount_paid stays 0.
        // locked_price_paise is the rate the member is on from now on.
        amount_paid: 0,
        locked_price_paise: lockedPricePaise,
        status: "active",
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })

      // The account exists either way. Say which half failed rather than
      // reporting a clean success the admin would have to go and disprove.
      if (subError) {
        console.error("Create member subscription failed:", subError)

        return NextResponse.json(
          {
            error: `${full_name} was created, but their access could not be set up: ${subError.message}`,
            profileId: profile?.id ?? null,
          },
          { status: 500 },
        )
      }
    }

    let emailed = false
    if (send_login) {
      try {
        const token = await createMagicLoginToken(userId)
        await sendMagicLinkEmail({ to: email, name: full_name, token })
        emailed = true
      } catch (err) {
        // The account exists either way — report it rather than failing
        // the whole request and leaving the admin unsure what landed.
        console.error("Login email failed for new member:", err)
      }
    }

    await logAdminAction({
      adminUserId: auth.userId,
      adminEmail: auth.email,
      targetUserId: userId,
      targetProfileId: profile?.id ?? null,
      action: "create_member",
      detail: {
        email,
        full_name,
        access_days,
        login_email_sent: emailed,
        // Whether a password was set, never the password itself — the audit
        // trail is readable by every admin and is kept indefinitely.
        password_set_by_admin: Boolean(password),
        locked_price_paise: access_days > 0 && !krExpiresAt ? lockedPricePaise : null,
        karma_recode_until: krExpiresAt,
      },
      note: note ?? null,
    })

    const accessNote = krExpiresAt
      ? ` Karma Recode and Lifinity until ${new Date(krExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}.`
      : access_days > 0
        ? ` Locked at ${formatINR(lockedPricePaise)}/month.`
        : ""

    const signInNote = password
      ? " They can sign in with the password you set."
      : emailed
        ? ` Login link sent to ${email}.`
        : " The login email could not be sent."

    return NextResponse.json(
      {
        message: `${full_name} created.${signInNote}${accessNote}`,
        profileId: profile?.id ?? null,
        emailed,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("POST /api/admin/members/create error:", error)
    return NextResponse.json({ error: "Could not create the member" }, { status: 500 })
  }
}
