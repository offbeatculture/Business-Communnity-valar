// ════════════════════════════════════════════════════════════
// consumeInviteByToken — server-only invite consumption
// ════════════════════════════════════════════════════════════
//
// Idempotent: given a raw token, materialise (or return) the
// audit_submissions row that backs this invite. Called directly from:
//   - app/(public)/assess/[token]/form/page.tsx
//   - app/api/invites/[token]/consume/route.ts (HTTP shim)
//
// Same rationale as resolveInviteByToken — direct invocation avoids
// the RSC-to-self HTTP round-trip.
//
// Returns the canonical ConsumeInviteResponse shape.

import "server-only"
import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import type { ConsumeInviteResponse } from "@/types/assessment"

const TOKEN_FORMAT = /^[A-Za-z0-9_-]{40,60}$/

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function consumeInviteByToken(
  token: string,
): Promise<ConsumeInviteResponse> {
  if (!token || typeof token !== "string" || !TOKEN_FORMAT.test(token)) {
    return { ok: false, error: "Invite not found" }
  }

  const admin = createAdminClient()
  const tokenHash = hashToken(token)

  const { data: invite, error: lookupError } = await admin
    .from("assessment_invites")
    .select(
      "id, email, full_name, phone, vertical, status, submission_id",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (lookupError) {
    console.error("consumeInviteByToken lookup error:", lookupError)
    return { ok: false, error: "Failed to consume invite" }
  }

  if (!invite) {
    return { ok: false, error: "Invite not found" }
  }

  // Idempotency: if we already created a submission for this invite,
  // return it regardless of status — covers double-clicks and refreshes.
  if (invite.submission_id) {
    return { ok: true, submission_id: invite.submission_id }
  }

  // First-time consume must be in an open/in-progress state.
  // (Bug #2 — Commit 2 will widen this to also accept 'issued'.)
  if (invite.status !== "opened" && invite.status !== "in_progress") {
    return {
      ok: false,
      error: "Invite cannot be consumed in current state",
    }
  }

  // business_name and phone are NOT NULL on audit_submissions but the
  // invite may not carry them. We use clearly-placeholder sentinels so
  // any in-between state is legible if someone queries the DB. The
  // submit route lifts the real values out of answers.__identity onto
  // the top-level columns.
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
    console.error("consumeInviteByToken insert error:", insertError)
    return { ok: false, error: "Failed to start assessment" }
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
      "consumeInviteByToken invite update error:",
      updateError,
    )
    // The submission row exists. Treat as failure so the caller doesn't
    // proceed with an orphan link. Commit 3 introduces a proper RPC for
    // atomicity.
    return { ok: false, error: "Failed to link invite to assessment" }
  }

  return { ok: true, submission_id: submission.id }
}
