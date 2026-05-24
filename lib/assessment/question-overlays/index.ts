// Long-form assessment — per-vertical question overlays
// ════════════════════════════════════════════════════════════
// The universal long-form questions live in lib/assessment/questions.ts
// (written by sibling agent A). They hold the scoring vocabulary
// (option `value` strings). Per-vertical overlays in this folder
// override the question_text, helper, format_hint, unit, and option
// labels — making each question feel native to that founder's
// industry.
//
// resolveAssessmentQuestion(q, vertical) returns the question with
// the overlay applied. Fallback order:
//   1. Long-form per-vertical overlay defined here (Q19-Q89, QX1-QX6)
//   2. Existing lib/audit/question-overlays resolver (covers Q1-Q18
//      with full 14-vertical coverage)
//   3. The universal question definition (no rewording)
//
// Option `value` strings are NEVER overridden — the scoring engine
// reads them. Only labels and surrounding copy change.

import type {
  AuditQuestion,
  QuestionOverlay,
  VerticalQuestionOverlays,
  VerticalValue,
} from "@/lib/audit/types"
import { resolveQuestion as resolveUniversalQuestion } from "@/lib/audit/question-overlays"

import saasB2B from "./saas_b2b"
import agencyServices from "./agency_services"
import manufacturing from "./manufacturing"

const ASSESSMENT_OVERLAYS: Partial<
  Record<VerticalValue, VerticalQuestionOverlays>
> = {
  saas_b2b: saasB2B,
  agency_services: agencyServices,
  manufacturing: manufacturing,
}

export function getAssessmentOverlay(
  vertical: VerticalValue | null | undefined,
  qid: string,
): QuestionOverlay | null {
  if (!vertical) return null
  const v = ASSESSMENT_OVERLAYS[vertical]
  if (!v) return null
  return v[qid] ?? null
}

// Returns a new AuditQuestion with the per-vertical long-form overlay
// applied. If no long-form overlay is defined for the question (e.g. the
// universal wording is already industry-neutral, or this is a Q1-Q18
// question), we fall back to the existing audit overlay resolver which
// has full 14-vertical coverage for Q1-Q18 and is a no-op otherwise.
export function resolveAssessmentQuestion(
  base: AuditQuestion,
  vertical: VerticalValue | null | undefined,
): AuditQuestion {
  if (!vertical) return resolveUniversalQuestion(base, null)

  const overlay = getAssessmentOverlay(vertical, base.id)
  if (!overlay) {
    // Fall back to the existing Q1-Q18 audit overlay system.
    return resolveUniversalQuestion(base, vertical)
  }

  return applyOverlay(base, overlay)
}

// Mirrors applyOverlay in lib/audit/question-overlays/index.ts. Kept
// here so any future divergence in long-form-only overlay fields is
// contained to this module.
function applyOverlay(
  q: AuditQuestion,
  overlay: QuestionOverlay,
): AuditQuestion {
  if (q.input_type === "number") {
    return {
      ...q,
      question_text: overlay.question_text ?? q.question_text,
      format_hint: overlay.format_hint ?? q.format_hint,
      unit: overlay.unit ?? q.unit,
      helper: overlay.helper ?? q.helper,
    }
  }

  const options = overlay.option_labels
    ? q.options.map((opt) =>
        overlay.option_labels?.[opt.value]
          ? { ...opt, label: overlay.option_labels[opt.value] }
          : opt,
      )
    : q.options

  if (q.input_type === "band") {
    return {
      ...q,
      question_text: overlay.question_text ?? q.question_text,
      helper: overlay.helper ?? q.helper,
      unit: overlay.unit ?? q.unit,
      options,
    }
  }

  // choice
  return {
    ...q,
    question_text: overlay.question_text ?? q.question_text,
    helper: overlay.helper ?? q.helper,
    options,
  }
}
