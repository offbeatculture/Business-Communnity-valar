// Long-form founder assessment — shared types
// ────────────────────────────────────────────────────────────
// Phase 1: invite-only entry, stub report generation, manual
// approval queue. Real Claude-driven reports land in Phase 3.
//
// These types are the shared contract across:
//   - supabase/migrations/20260525_long_form_assessment_phase1.sql
//   - app/api/admin/invites/route.ts (issue)
//   - app/api/invites/[token]/* (resolve, consume)
//   - app/api/assessment/[id]/* (save, submit)
//   - app/api/admin/report-drafts/* (queue, approve, reject)
//   - app/(public)/assess/[token]/* (founder UI)
//   - app/(admin)/admin/assessment-{invites,reports}/* (admin UI)
//   - lib/report/{schema,stub-generator,render-pdf}.ts

// ─── Lifecycle status enums ──────────────────────────────────

/**
 * An assessment_invites row's lifecycle. Issued by admin → opened
 * (founder follows the magic link) → in_progress (founder starts
 * answering) → submitted (final POST), or expired/revoked.
 */
export type AssessmentInviteStatus =
  | "issued"
  | "opened"
  | "in_progress"
  | "submitted"
  | "expired"
  | "revoked"

/**
 * The report lifecycle on an `audit_submissions` row when
 * submission_kind = 'invite_assessment'.
 *
 * - awaiting_generation: submission written, no draft yet
 * - generating: a worker has claimed the job (Phase 3+)
 * - awaiting_approval: a draft exists, waiting on admin
 * - approved: admin approved, ready to email
 * - rejected: admin rejected; will requeue for regeneration
 * - sent: email delivered
 * - failed: terminal failure after max attempts
 */
export type ReportStatus =
  | "awaiting_generation"
  | "generating"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "sent"
  | "failed"

/**
 * Distinguishes the public `/audit` flow (which emails on submit) from
 * the invite-only assessment flow (which routes through the approval
 * queue). Public audits never get queue treatment.
 */
export type SubmissionKind = "public_audit" | "invite_assessment"

/**
 * A row in report_drafts. Each submission can have multiple versions
 * (regeneration history). Only one is `approved` at any time.
 */
export type ReportDraftStatus = "draft" | "approved" | "rejected" | "superseded"

/**
 * Which engine produced a draft. Phase 1 only ever writes `stub`.
 * Phase 3 introduces claude-cli (Option A: Mac daemon) and
 * anthropic-api (Option B: Vercel cron).
 */
export type ReportGenerator = "stub" | "claude-cli" | "anthropic-api"

// ─── Phase 1 stub payload shape ──────────────────────────────
//
// Deliberately MINIMAL — Phase 1 proves plumbing. Phase 3 introduces
// the full ReportPayloadSchema with 15 sections of structured content.
// The stub fills only enough slots to render a recognisable PDF and
// validate the approval round-trip.

export type StubReportPayload = {
  version: "1-stub"
  founder: {
    full_name: string
    business_name: string
    vertical: string // VerticalValue from lib/audit/types
    vertical_label: string
  }
  archetype: {
    name: string // e.g. "The Grinder"
    one_liner: string
    secondary: string // second-closest archetype name
  }
  lie: {
    name: string // one of the 9 bootcamp Lies
    why_we_think_you_hold_this: string[] // 2-3 evidence lines
    contradiction: string // "You say X, your numbers say Y"
  }
  scores: Record<string, number> // ForceKey -> 0-5
  named_move: {
    title: string // sprint name
    promise: string // the promise sentence
    target_metric: string // measurable target
  }
  generated_at: string // ISO timestamp
  stub_note: string // banner — "Phase 1 stub. Real generation in Phase 3."
}

// ─── API request/response shapes ─────────────────────────────

// POST /api/admin/invites
export type IssueInviteRequest = {
  email: string
  full_name: string
  phone?: string
  vertical?: string
}
export type IssueInviteResponse = {
  invite_id: string
  token: string
  link: string // full magic link, e.g. https://app/assess/<token>
}

// GET /api/invites/[token]/resolve
export type ResolveInviteResponse =
  | {
      ok: true
      email: string
      full_name: string
      status: AssessmentInviteStatus
      submission_id: string | null
    }
  | {
      ok: false
      error: string
    }

// POST /api/invites/[token]/consume
export type ConsumeInviteResponse =
  | { ok: true; submission_id: string }
  | { ok: false; error: string }

// POST /api/assessment/[submissionId]/save
export type SaveAssessmentRequest = {
  answers: Record<string, unknown>
}
export type SaveAssessmentResponse =
  | { ok: true }
  | { ok: false; error: string }

// POST /api/assessment/[submissionId]/submit
export type SubmitAssessmentRequest = {
  answers: Record<string, unknown>
}
export type SubmitAssessmentResponse =
  | { ok: true; submission_id: string; draft_id: string }
  | { ok: false; error: string }

// GET /api/admin/report-drafts?status=draft
export type ReportDraftRow = {
  id: string
  submission_id: string
  version: number
  status: ReportDraftStatus
  generator: ReportGenerator
  founder_name: string
  business_name: string
  email: string
  vertical: string
  created_at: string
  reviewed_at: string | null
  review_note: string | null
}
export type ListReportDraftsResponse =
  | { ok: true; drafts: ReportDraftRow[] }
  | { ok: false; error: string }

// POST /api/admin/report-drafts/[id]/approve
export type ApproveDraftResponse =
  | { ok: true; email_sent: boolean }
  | { ok: false; error: string }

// POST /api/admin/report-drafts/[id]/reject
export type RejectDraftRequest = {
  note: string
}
export type RejectDraftResponse =
  | { ok: true }
  | { ok: false; error: string }
