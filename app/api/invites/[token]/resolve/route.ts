import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { rateLimit } from "@/lib/rate-limit"
import { resolveInviteByToken } from "@/lib/assessment/server/resolveInviteByToken"
import type { ResolveInviteResponse } from "@/types/assessment"

export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// GET /api/invites/[token]/resolve — magic-link entry check
// ════════════════════════════════════════════════════════════
//
// Thin HTTP shim around `resolveInviteByToken`. RSC pages call the
// shared function directly; this route exists for any future
// client-side use (and to preserve the API surface from Phase 1).

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

    // Rate-limit by token hash to avoid leaking a token-length oracle.
    const tokenHash = createHash("sha256").update(token ?? "").digest("hex")
    const { allowed } = rateLimit({
      key: `invite:resolve:${tokenHash}`,
      limit: 10,
      windowMs: 5 * 60 * 1000,
    })
    if (!allowed) {
      return jsonErr("Too many requests. Please wait a few minutes.", 429)
    }

    const result = await resolveInviteByToken(token)

    if (!result.ok) {
      // 404 for unknown / bad-format tokens; 500 for actual DB errors.
      const status = result.error === "Failed to resolve invite" ? 500 : 404
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    console.error("GET /api/invites/[token]/resolve error:", err)
    return jsonErr("Failed to resolve invite", 500)
  }
}
