import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { randomBytes, createHash } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendAssessmentInviteEmail } from "@/lib/email/send-assessment-invite"
import type { ResendInviteResponse } from "@/types/assessment"

export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// POST /api/admin/invites/[id]/resend
// Re-send an existing invite email. The plaintext token was
// discarded at issue time (only the sha256 hash is stored), so
// this ROTATES the token: hashes a fresh value, updates
// token_hash, and emails the new link. Any old copy of the link
// becomes unusable immediately.
//
// Only valid on `issued` and `opened` invites. For `in_progress`
// the founder is already inside — rotating would break their
// resume link. For terminal states, resend makes no sense.
// ════════════════════════════════════════════════════════════

const idSchema = z.string().uuid()

function jsonErr(error: string, status: number) {
  const body: ResendInviteResponse = { ok: false, error }
  return NextResponse.json(body, { status })
}

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()
  return profile?.role === "admin" ? user : null
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function buildAppUrl(request: Request): string {
  const origin = request.headers.get("origin")
  return (
    origin ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "")
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) {
      return jsonErr("Unauthorized", 401)
    }

    const { id } = await params
    const idCheck = idSchema.safeParse(id)
    if (!idCheck.success) {
      return jsonErr("Invite not found", 404)
    }

    const admin = createAdminClient()

    const { data: invite, error: lookupError } = await admin
      .from("assessment_invites")
      .select("id, email, full_name, status")
      .eq("id", id)
      .maybeSingle()

    if (lookupError) {
      console.error("resend lookup error:", lookupError)
      return jsonErr("Failed to resend invite", 500)
    }

    if (!invite) {
      return jsonErr("Invite not found", 404)
    }

    if (invite.status === "in_progress") {
      return jsonErr(
        "Founder is mid-assessment — rotating the token would break their resume link.",
        409,
      )
    }

    if (
      invite.status === "submitted" ||
      invite.status === "expired" ||
      invite.status === "revoked"
    ) {
      return jsonErr("Cannot resend a terminal invite", 409)
    }

    // Rotate the token. Anything cached or already-distributed becomes
    // invalid. Reset opened_at since the new link hasn't been clicked yet.
    const newToken = randomBytes(32).toString("base64url")
    const newHash = hashToken(newToken)

    const { error: updateError } = await admin
      .from("assessment_invites")
      .update({
        token_hash: newHash,
        status: "issued",
        opened_at: null,
      })
      .eq("id", id)

    if (updateError) {
      console.error("resend rotate error:", updateError)
      return jsonErr("Failed to resend invite", 500)
    }

    const appUrl = buildAppUrl(request)
    const link = `${appUrl}/assess/${newToken}`

    let email_sent = false
    try {
      await sendAssessmentInviteEmail({
        to: invite.email,
        full_name: invite.full_name,
        magic_link: link,
      })
      email_sent = true
    } catch (sendErr) {
      console.error("resend email send error:", sendErr)
      email_sent = false
    }

    const response: ResendInviteResponse = { ok: true, email_sent }
    return NextResponse.json(response, { status: 200 })
  } catch (err) {
    console.error("POST /api/admin/invites/[id]/resend error:", err)
    return jsonErr("Failed to resend invite", 500)
  }
}
