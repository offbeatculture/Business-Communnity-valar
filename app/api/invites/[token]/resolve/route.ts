import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimit } from "@/lib/rate-limit"
import type {
  AssessmentInviteStatus,
  ResolveInviteResponse,
} from "@/types/assessment"

export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// GET /api/invites/[token]/resolve — magic-link entry check
// ════════════════════════════════════════════════════════════

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function jsonErr(error: string, status: number) {
  const body: ResolveInviteResponse = { ok: false, error }
  return NextResponse.json(body, { status })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params

    if (!token || typeof token !== "string" || token.length < 20) {
      return jsonErr("Invite not found", 404)
    }

    // Rate-limit by token hash to avoid leaking token-length oracle.
    const tokenHash = hashToken(token)
    const { allowed } = rateLimit({
      key: `invite:resolve:${tokenHash}`,
      limit: 10,
      windowMs: 5 * 60 * 1000,
    })
    if (!allowed) {
      return jsonErr("Too many requests. Please wait a few minutes.", 429)
    }

    const admin = createAdminClient()

    const { data: invite, error: lookupError } = await admin
      .from("assessment_invites")
      .select(
        "id, email, full_name, status, opened_at, submission_id, expires_at",
      )
      .eq("token_hash", tokenHash)
      .maybeSingle()

    if (lookupError) {
      console.error("GET /api/invites/[token]/resolve lookup error:", lookupError)
      return jsonErr("Failed to resolve invite", 500)
    }

    if (!invite) {
      return jsonErr("Invite not found", 404)
    }

    const now = new Date()
    const expiresAt = invite.expires_at ? new Date(invite.expires_at) : null

    // Expire if past expires_at AND still in 'issued' state.
    if (
      expiresAt &&
      expiresAt.getTime() < now.getTime() &&
      invite.status === "issued"
    ) {
      const { error: expireError } = await admin
        .from("assessment_invites")
        .update({ status: "expired" })
        .eq("id", invite.id)

      if (expireError) {
        console.error(
          "GET /api/invites/[token]/resolve failed to mark expired:",
          expireError,
        )
      }

      return jsonErr("This invite has expired", 410)
    }

    if (invite.status === "revoked") {
      return jsonErr("Invite has been revoked", 410)
    }

    if (invite.status === "submitted") {
      return jsonErr("This invite has already been used", 410)
    }

    if (invite.status === "expired") {
      return jsonErr("This invite has expired", 410)
    }

    // First click: flip 'issued' → 'opened' and stamp opened_at.
    let currentStatus = invite.status as AssessmentInviteStatus

    if (invite.status === "issued" && !invite.opened_at) {
      const { error: openError } = await admin
        .from("assessment_invites")
        .update({ status: "opened", opened_at: now.toISOString() })
        .eq("id", invite.id)

      if (openError) {
        console.error(
          "GET /api/invites/[token]/resolve failed to mark opened:",
          openError,
        )
      } else {
        currentStatus = "opened"
      }
    }

    const body: ResolveInviteResponse = {
      ok: true,
      email: invite.email,
      full_name: invite.full_name,
      status: currentStatus,
      submission_id: invite.submission_id ?? null,
    }

    return NextResponse.json(body, { status: 200 })
  } catch (err) {
    console.error("GET /api/invites/[token]/resolve error:", err)
    return jsonErr("Failed to resolve invite", 500)
  }
}
