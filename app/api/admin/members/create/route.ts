import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin, logAdminAction } from "@/lib/admin-audit"
import { createMagicLoginToken } from "@/lib/magic-link"
import { sendMagicLinkEmail } from "@/lib/ses"
import { SINGLE_PLAN } from "@/lib/plans"

const schema = z.object({
  email: z.string().email().max(255),
  full_name: z.string().min(1).max(120),
  // 0 = create the account with no access, for someone who will pay later.
  access_days: z.number().int().min(0).max(3650).default(30),
  send_login: z.boolean().default(true),
  note: z.string().max(500).optional(),
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

    const { email, full_name, access_days, send_login, note } = parsed.data
    const admin = createAdminClient()

    // Check for an existing account FIRST. Calling createUser blind would
    // hit a duplicate-email error and leave the admin guessing whether
    // anything happened.
    const { data: existingId } = await admin.rpc("get_user_id_by_email", {
      p_email: email,
    })

    if (existingId) {
      return NextResponse.json(
        {
          error: "An account with that email already exists.",
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
    const { data: profile } = await admin
      .from("profiles")
      .upsert(
        { user_id: userId, full_name },
        { onConflict: "user_id" },
      )
      .select("id")
      .single()

    if (access_days > 0) {
      const expiresAt = new Date(Date.now() + access_days * 86_400_000)
      await admin.from("subscriptions").insert({
        user_id: userId,
        plan_name: SINGLE_PLAN.name,
        plan_label: SINGLE_PLAN.label,
        amount_paid: 0,
        status: "active",
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
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
      detail: { email, full_name, access_days, login_email_sent: emailed },
      note: note ?? null,
    })

    return NextResponse.json(
      {
        message: emailed
          ? `${full_name} created — login link sent to ${email}`
          : `${full_name} created. The login email could not be sent.`,
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
