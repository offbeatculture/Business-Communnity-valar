import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimit } from "@/lib/rate-limit"
import type { ConsumeInviteResponse } from "@/types/assessment"

export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// POST /api/invites/[token]/consume — start the assessment
// Idempotent: returns the existing submission_id if already
// consumed.
// ════════════════════════════════════════════════════════════

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function jsonErr(error: string, status: number) {
  const body: ConsumeInviteResponse = { ok: false, error }
  return NextResponse.json(body, { status })
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params

    if (!token || typeof token !== "string" || token.length < 20) {
      return jsonErr("Invite not found", 404)
    }

    const tokenHash = hashToken(token)

    const { allowed } = rateLimit({
      key: `invite:consume:${tokenHash}`,
      limit: 5,
      windowMs: 5 * 60 * 1000,
    })
    if (!allowed) {
      return jsonErr("Too many requests. Please wait a few minutes.", 429)
    }

    const admin = createAdminClient()

    const { data: invite, error: lookupError } = await admin
      .from("assessment_invites")
      .select(
        "id, email, full_name, phone, vertical, status, submission_id",
      )
      .eq("token_hash", tokenHash)
      .maybeSingle()

    if (lookupError) {
      console.error(
        "POST /api/invites/[token]/consume lookup error:",
        lookupError,
      )
      return jsonErr("Failed to consume invite", 500)
    }

    if (!invite) {
      return jsonErr("Invite not found", 404)
    }

    // Idempotency: if we already have a submission for this invite,
    // return it regardless of status — covers double-clicks and
    // browser refreshes after consumption.
    if (invite.submission_id) {
      const body: ConsumeInviteResponse = {
        ok: true,
        submission_id: invite.submission_id,
      }
      return NextResponse.json(body, { status: 200 })
    }

    if (invite.status !== "opened" && invite.status !== "in_progress") {
      return jsonErr("Invite cannot be consumed in current state", 409)
    }

    // business_name and phone are NOT NULL on audit_submissions but the
    // invite may not carry them. We use clearly-placeholder sentinels so
    // any in-between state (consumed but not yet submitted) is legible
    // if someone queries the DB. The submit route lifts the real values
    // out of answers.__identity onto the top-level columns.
    const { data: submission, error: insertError } = await admin
      .from("audit_submissions")
      .insert({
        full_name: invite.full_name,
        business_name: "(pending)",
        phone: invite.phone ?? "",
        email: invite.email,
        vertical: invite.vertical ?? "other",
        answers: {},
        status: "in_progress",
        submission_kind: "invite_assessment",
        invite_id: invite.id,
        report_status: "awaiting_generation",
      })
      .select("id")
      .single()

    if (insertError || !submission) {
      console.error(
        "POST /api/invites/[token]/consume insert error:",
        insertError,
      )
      return jsonErr("Failed to start assessment", 500)
    }

    const { error: updateError } = await admin
      .from("assessment_invites")
      .update({
        status: "in_progress",
        consumed_at: new Date().toISOString(),
        submission_id: submission.id,
      })
      .eq("id", invite.id)

    if (updateError) {
      console.error(
        "POST /api/invites/[token]/consume invite update error:",
        updateError,
      )
      // The submission row exists; the next consume call will be
      // idempotent on submission_id lookup via the orphan. But
      // since we couldn't link them, treat as failure to avoid
      // silently losing the link.
      return jsonErr("Failed to link invite to assessment", 500)
    }

    const body: ConsumeInviteResponse = {
      ok: true,
      submission_id: submission.id,
    }
    return NextResponse.json(body, { status: 201 })
  } catch (err) {
    console.error("POST /api/invites/[token]/consume error:", err)
    return jsonErr("Failed to consume invite", 500)
  }
}
