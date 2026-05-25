import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { rateLimit } from "@/lib/rate-limit"
import { consumeInviteByToken } from "@/lib/assessment/server/consumeInviteByToken"
import type { ConsumeInviteResponse } from "@/types/assessment"

export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// POST /api/invites/[token]/consume — start the assessment
// ════════════════════════════════════════════════════════════
//
// Thin HTTP shim around `consumeInviteByToken`. RSC pages call the
// shared function directly; this route exists for any future
// client-side use.

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

    const tokenHash = createHash("sha256").update(token ?? "").digest("hex")
    const { allowed } = rateLimit({
      key: `invite:consume:${tokenHash}`,
      limit: 5,
      windowMs: 5 * 60 * 1000,
    })
    if (!allowed) {
      return jsonErr("Too many requests. Please wait a few minutes.", 429)
    }

    const result = await consumeInviteByToken(token)

    if (!result.ok) {
      // 404 for unknown / bad-format tokens; 409 for wrong state;
      // 500 for actual failures.
      let status = 404
      if (result.error === "Invite cannot be consumed in current state") {
        status = 409
      } else if (
        result.error === "Failed to consume invite" ||
        result.error === "Failed to start assessment" ||
        result.error === "Failed to link invite to assessment"
      ) {
        status = 500
      }
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error("POST /api/invites/[token]/consume error:", err)
    return jsonErr("Failed to consume invite", 500)
  }
}
