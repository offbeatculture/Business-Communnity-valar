// ════════════════════════════════════════════════════════════
// getSubmissionForResume — load existing answers + identity on refresh
// ════════════════════════════════════════════════════════════
//
// The founder form auto-saves on every screen transition, but if
// the user refreshes or closes + reopens the tab, the React state
// in AssessmentFormWrapper resets. Without rehydration, all their
// progress appears lost (the DB still has it, the UI just doesn't
// read it back).
//
// This server-only helper, called from /assess/[token]/form/page.tsx
// after consumeInviteByToken returns the submissionId, fetches the
// current answers blob and separates the bundled __identity from
// the question answers so the wrapper can seed both pieces of state.

import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { VERTICALS } from "@/lib/audit/types"
import type { AuditAnswers, VerticalValue } from "@/lib/audit/types"

const VERTICAL_VALUES = new Set<string>(VERTICALS.map((v) => v.value))

export type ResumeIdentity = {
  full_name: string
  business_name: string
  phone: string
  email: string
  city: string
  vertical: VerticalValue | ""
}

export type SubmissionResumeState = {
  // Typed as AuditAnswers for the consumer. Runtime contents are
  // whatever the wrapper previously serialised (the same shape),
  // minus the __identity key which is split out separately.
  initialAnswers: AuditAnswers
  initialIdentity: ResumeIdentity
}

const EMPTY: SubmissionResumeState = {
  initialAnswers: {} as AuditAnswers,
  initialIdentity: {
    full_name: "",
    business_name: "",
    phone: "",
    email: "",
    city: "",
    vertical: "",
  },
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : ""
}

function asVertical(v: unknown): VerticalValue | "" {
  if (typeof v === "string" && VERTICAL_VALUES.has(v)) {
    return v as VerticalValue
  }
  return ""
}

export async function getSubmissionForResume(
  submissionId: string,
  fallback: { full_name: string; email: string },
): Promise<SubmissionResumeState> {
  if (!submissionId) {
    return {
      ...EMPTY,
      initialIdentity: {
        ...EMPTY.initialIdentity,
        full_name: fallback.full_name ?? "",
        email: fallback.email ?? "",
      },
    }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("audit_submissions")
    .select("answers, full_name, business_name, phone, email, vertical, city")
    .eq("id", submissionId)
    .maybeSingle()

  if (error) {
    console.error("getSubmissionForResume lookup error:", error)
    return {
      ...EMPTY,
      initialIdentity: {
        ...EMPTY.initialIdentity,
        full_name: fallback.full_name ?? "",
        email: fallback.email ?? "",
      },
    }
  }

  if (!data) {
    return {
      ...EMPTY,
      initialIdentity: {
        ...EMPTY.initialIdentity,
        full_name: fallback.full_name ?? "",
        email: fallback.email ?? "",
      },
    }
  }

  const answersBlob =
    (data.answers as Record<string, unknown> | null) ?? {}

  // Pull __identity off the answers blob (the wrapper bundles it
  // there on every save). Prefer the bundled values, fall back to
  // the top-level audit_submissions columns, then to the invite
  // identity, then to empty.
  const bundled =
    (answersBlob as { __identity?: Record<string, unknown> }).__identity ?? {}

  // Build the rest of the answers blob WITHOUT __identity so the
  // wrapper's `answers` state isn't polluted with a non-question key.
  // Cast to AuditAnswers: the values were originally serialised BY the
  // wrapper, so their shape matches by construction. We deliberately
  // don't re-validate per-question here (the form re-validates on
  // navigation anyway).
  const initialAnswers = {} as AuditAnswers
  for (const [k, v] of Object.entries(answersBlob)) {
    if (k !== "__identity") {
      (initialAnswers as Record<string, unknown>)[k] = v
    }
  }

  const initialIdentity: ResumeIdentity = {
    full_name:
      asString(bundled.full_name) ||
      asString(data.full_name) ||
      fallback.full_name ||
      "",
    business_name:
      asString(bundled.business_name) ||
      // Don't propagate the "(pending)" placeholder set at consume time.
      (asString(data.business_name) === "(pending)"
        ? ""
        : asString(data.business_name)) ||
      "",
    phone:
      asString(bundled.phone) || asString(data.phone) || "",
    email:
      asString(bundled.email) ||
      asString(data.email) ||
      fallback.email ||
      "",
    city: asString(bundled.city) || asString(data.city) || "",
    vertical:
      asVertical(bundled.vertical) || asVertical(data.vertical) || "",
  }

  return { initialAnswers, initialIdentity }
}
