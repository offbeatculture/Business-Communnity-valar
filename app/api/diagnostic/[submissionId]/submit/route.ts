import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateStubReport } from "@/lib/report/stub-generator"
import { VERTICALS } from "@/lib/audit/types"
import type { SubmitAssessmentResponse } from "@/types/assessment"

const VERTICAL_VALUES = new Set<string>(VERTICALS.map((v) => v.value))

export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// POST /api/diagnostic/[submissionId]/submit
// Final answer payload. Marks the submission as submitted,
// generates the Phase 1 stub report, writes a v1 draft, and
// flips report_status to awaiting_approval.
//
// Idempotent: if a draft already exists for a submitted
// submission, returns that draft id.
// ════════════════════════════════════════════════════════════

const bodySchema = z.object({
  answers: z.record(z.string(), z.unknown()),
})

const submissionIdSchema = z.string().uuid()

function jsonErr(error: string, status: number) {
  const body: SubmitAssessmentResponse = { ok: false, error }
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
      .select("*")
      .eq("id", submissionId)
      .maybeSingle()

    if (lookupError) {
      console.error(
        "POST /api/diagnostic/[submissionId]/submit lookup error:",
        lookupError,
      )
      return jsonErr("Failed to submit", 500)
    }

    if (!submission || submission.submission_kind !== "invite_assessment") {
      return jsonErr("Submission not found", 404)
    }

    // Idempotency: already submitted + draft exists → return it.
    if (submission.status === "submitted") {
      const { data: existingDraft, error: draftLookupError } = await admin
        .from("report_drafts")
        .select("id")
        .eq("submission_id", submissionId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (draftLookupError) {
        console.error(
          "POST /api/diagnostic/[submissionId]/submit existing draft lookup error:",
          draftLookupError,
        )
        return jsonErr("Failed to submit", 500)
      }

      if (existingDraft) {
        const body: SubmitAssessmentResponse = {
          ok: true,
          submission_id: submissionId,
          draft_id: existingDraft.id,
        }
        return NextResponse.json(body, { status: 200 })
      }
      // No draft yet — fall through and try generation again.
    }

    if (submission.status !== "in_progress" && submission.status !== "submitted") {
      return jsonErr("Submission cannot be submitted in current state", 409)
    }

    const existingAnswers =
      (submission.answers as Record<string, unknown> | null) ?? {}
    const mergedAnswers = { ...existingAnswers, ...incoming }
    const submittedAt = new Date().toISOString()

    // Extract __identity from the answers blob (the AssessmentFormWrapper
    // bundles identity under this key) and lift it onto the top-level
    // audit_submissions columns. Otherwise the stub generator, the admin
    // queue, and the email all see stale placeholders written at consume
    // time. We keep __identity inside the answers blob too — useful as
    // an audit trail and harmless for the stub generator.
    const identityFromAnswers =
      (mergedAnswers as {
        __identity?: {
          full_name?: unknown
          business_name?: unknown
          phone?: unknown
          email?: unknown
          city?: unknown
          vertical?: unknown
        }
      }).__identity ?? {}

    const identityUpdates: Record<string, unknown> = {}
    if (
      typeof identityFromAnswers.full_name === "string" &&
      identityFromAnswers.full_name.trim().length >= 2
    ) {
      identityUpdates.full_name = identityFromAnswers.full_name.trim()
    }
    if (
      typeof identityFromAnswers.business_name === "string" &&
      identityFromAnswers.business_name.trim().length >= 2
    ) {
      identityUpdates.business_name = identityFromAnswers.business_name.trim()
    }
    if (
      typeof identityFromAnswers.phone === "string" &&
      /^[6-9]\d{9}$/.test(identityFromAnswers.phone)
    ) {
      identityUpdates.phone = identityFromAnswers.phone
    }
    if (
      typeof identityFromAnswers.email === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identityFromAnswers.email)
    ) {
      identityUpdates.email = identityFromAnswers.email.trim()
    }
    if (typeof identityFromAnswers.city === "string") {
      const trimmed = identityFromAnswers.city.trim()
      identityUpdates.city = trimmed.length > 0 ? trimmed : null
    }
    if (
      typeof identityFromAnswers.vertical === "string" &&
      VERTICAL_VALUES.has(identityFromAnswers.vertical)
    ) {
      identityUpdates.vertical = identityFromAnswers.vertical
    }

    const { data: updatedSubmission, error: updateError } = await admin
      .from("audit_submissions")
      .update({
        ...identityUpdates,
        status: "submitted",
        submitted_at: submittedAt,
        answers: mergedAnswers,
        report_status: "awaiting_generation",
        report_status_changed_at: submittedAt,
      })
      .eq("id", submissionId)
      .select("*")
      .single()

    if (updateError || !updatedSubmission) {
      console.error(
        "POST /api/diagnostic/[submissionId]/submit update error:",
        updateError,
      )
      return jsonErr("Failed to submit", 500)
    }

    // Generate stub report (sync). If anything throws, mark failed.
    let stubPayload
    try {
      stubPayload = generateStubReport(updatedSubmission)
    } catch (genErr) {
      console.error(
        "POST /api/diagnostic/[submissionId]/submit stub generation failed:",
        genErr,
      )
      const failedAt = new Date().toISOString()
      const { error: failError } = await admin
        .from("audit_submissions")
        .update({
          report_status: "failed",
          report_status_changed_at: failedAt,
        })
        .eq("id", submissionId)
      if (failError) {
        console.error(
          "POST /api/diagnostic/[submissionId]/submit failed-state update error:",
          failError,
        )
      }
      return jsonErr("Failed to generate report", 500)
    }

    const { data: draft, error: draftError } = await admin
      .from("report_drafts")
      .insert({
        submission_id: submissionId,
        version: 1,
        status: "draft",
        payload: stubPayload,
        generator: "stub",
      })
      .select("id")
      .single()

    if (draftError || !draft) {
      console.error(
        "POST /api/diagnostic/[submissionId]/submit draft insert error:",
        draftError,
      )
      const failedAt = new Date().toISOString()
      const { error: failError } = await admin
        .from("audit_submissions")
        .update({
          report_status: "failed",
          report_status_changed_at: failedAt,
        })
        .eq("id", submissionId)
      if (failError) {
        console.error(
          "POST /api/diagnostic/[submissionId]/submit failed-state update error:",
          failError,
        )
      }
      return jsonErr("Failed to save draft", 500)
    }

    const approvalAt = new Date().toISOString()
    const { error: statusError } = await admin
      .from("audit_submissions")
      .update({
        report_status: "awaiting_approval",
        report_status_changed_at: approvalAt,
      })
      .eq("id", submissionId)

    if (statusError) {
      console.error(
        "POST /api/diagnostic/[submissionId]/submit status flip error:",
        statusError,
      )
      // Non-fatal: draft is written, status will be reconciled by admin view.
    }

    // Flip the linked invite to 'submitted' so it can't be reused. The
    // resolve route uses invite.status to gate re-entry; without this
    // flip, a founder reopening their magic link after submitting would
    // see a fresh briefing instead of "Already submitted", and could
    // create a duplicate in-progress submission. Non-fatal -- the
    // submission itself is already safely written.
    if (updatedSubmission.invite_id) {
      const { error: inviteFlipError } = await admin
        .from("assessment_invites")
        .update({ status: "submitted" })
        .eq("id", updatedSubmission.invite_id)
      if (inviteFlipError) {
        console.error(
          "POST /api/diagnostic/[submissionId]/submit invite status flip error:",
          inviteFlipError,
        )
      }
    }

    const body: SubmitAssessmentResponse = {
      ok: true,
      submission_id: submissionId,
      draft_id: draft.id,
    }
    return NextResponse.json(body, { status: 201 })
  } catch (err) {
    console.error("POST /api/diagnostic/[submissionId]/submit error:", err)
    return jsonErr("Failed to submit", 500)
  }
}
