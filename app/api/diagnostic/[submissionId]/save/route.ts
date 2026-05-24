import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SaveAssessmentResponse } from "@/types/assessment"

export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// POST /api/diagnostic/[submissionId]/save
// Persists in-progress answers. Auth gate is the unguessable
// submission UUID (Phase 1). Merges incoming answers with the
// existing answers blob.
// ════════════════════════════════════════════════════════════

const bodySchema = z.object({
  answers: z.record(z.string(), z.unknown()),
})

const submissionIdSchema = z.string().uuid()

function jsonErr(error: string, status: number) {
  const body: SaveAssessmentResponse = { ok: false, error }
  return NextResponse.json(body, { status })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  try {
    const { submissionId } = await params

    const idCheck = submissionIdSchema.safeParse(submissionId)
    if (!idCheck.success) {
      return jsonErr("Submission not found", 404)
    }

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return jsonErr("Invalid request", 400)
    }

    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return jsonErr("Invalid request", 400)
    }

    const { answers: incoming } = parsed.data

    const admin = createAdminClient()

    const { data: submission, error: lookupError } = await admin
      .from("audit_submissions")
      .select("id, status, submission_kind, answers")
      .eq("id", submissionId)
      .maybeSingle()

    if (lookupError) {
      console.error(
        "POST /api/diagnostic/[submissionId]/save lookup error:",
        lookupError,
      )
      return jsonErr("Failed to save", 500)
    }

    if (!submission || submission.submission_kind !== "invite_assessment") {
      return jsonErr("Submission not found", 404)
    }

    if (submission.status !== "in_progress" && submission.status !== "submitted") {
      return jsonErr("Submission cannot be modified in current state", 409)
    }

    const existing =
      (submission.answers as Record<string, unknown> | null) ?? {}
    const merged = { ...existing, ...incoming }

    const { error: updateError } = await admin
      .from("audit_submissions")
      .update({
        answers: merged,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", submissionId)

    if (updateError) {
      console.error(
        "POST /api/diagnostic/[submissionId]/save update error:",
        updateError,
      )
      return jsonErr("Failed to save", 500)
    }

    const body: SaveAssessmentResponse = { ok: true }
    return NextResponse.json(body, { status: 200 })
  } catch (err) {
    console.error("POST /api/diagnostic/[submissionId]/save error:", err)
    return jsonErr("Failed to save", 500)
  }
}
