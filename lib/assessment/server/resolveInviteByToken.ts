// ════════════════════════════════════════════════════════════
// resolveInviteByToken — server-only invite lookup
// ════════════════════════════════════════════════════════════
//
// Single source of truth for "given a raw magic-link token, what is
// the founder's invite state?". Called directly from:
//   - app/(public)/assess/[token]/page.tsx       (briefing)
//   - app/(public)/assess/[token]/form/page.tsx  (form)
//   - app/(public)/assess/[token]/submitted/page.tsx
//   - app/api/invites/[token]/resolve/route.ts   (HTTP shim for future client use)
//
// RSC pages call this directly (no HTTP round-trip back to /api/invites/...).
// Server-to-self fetch on Vercel is fragile (edge routing, host detection,
// SSO can all break inter-function HTTP loops). Direct invocation
// eliminates the entire failure class.
//
// Side effects:
//   - flips an `issued` invite past `expires_at` to `expired`
//   - flips an `issued` invite to `opened` on first visit (stamps opened_at)
//
// Returns the canonical ResolveInviteResponse shape — ok=true for any
// valid lookup (including terminal statuses like submitted/expired/revoked,
// so the caller can render the right messaging). Only returns ok=false for
// actual lookup failures (bad token format, not found, DB error).

import "server-only"
import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import type {
  AssessmentInviteStatus,
  ResolveInviteResponse,
} from "@/types/assessment"

// 32-byte randomBytes → base64url → 43 chars. Allow a tight band to
// reject anything malformed without being prescriptive about exact length.
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{40,60}$/

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function resolveInviteByToken(
  token: string,
): Promise<ResolveInviteResponse> {
  if (!token || typeof token !== "string" || !TOKEN_FORMAT.test(token)) {
    return { ok: false, error: "Invite not found" }
  }

  const admin = createAdminClient()
  const tokenHash = hashToken(token)

  const { data: invite, error: lookupError } = await admin
    .from("assessment_invites")
    .select(
      "id, email, full_name, status, opened_at, submission_id, expires_at",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (lookupError) {
    console.error("resolveInviteByToken lookup error:", lookupError)
    return { ok: false, error: "Failed to resolve invite" }
  }

  if (!invite) {
    return { ok: false, error: "Invite not found" }
  }

  const now = new Date()
  const expiresAt = invite.expires_at ? new Date(invite.expires_at) : null
  let currentStatus = invite.status as AssessmentInviteStatus

  // Lazy expiry — only flip 'issued' rows; terminal/in-progress stay as-is.
  if (
    expiresAt &&
    expiresAt.getTime() < now.getTime() &&
    currentStatus === "issued"
  ) {
    const { error: expireError } = await admin
      .from("assessment_invites")
      .update({ status: "expired" })
      .eq("id", invite.id)
    if (expireError) {
      console.error("resolveInviteByToken failed to mark expired:", expireError)
    }
    currentStatus = "expired"
  }

  // First-click open transition.
  if (currentStatus === "issued" && !invite.opened_at) {
    const { error: openError } = await admin
      .from("assessment_invites")
      .update({ status: "opened", opened_at: now.toISOString() })
      .eq("id", invite.id)
    if (openError) {
      console.error("resolveInviteByToken failed to mark opened:", openError)
    } else {
      currentStatus = "opened"
    }
  }

  return {
    ok: true,
    email: invite.email,
    full_name: invite.full_name,
    status: currentStatus,
    submission_id: invite.submission_id ?? null,
  }
}
