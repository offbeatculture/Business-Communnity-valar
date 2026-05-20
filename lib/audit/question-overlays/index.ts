// 7 Forces Business Audit — per-vertical question overlays
// ════════════════════════════════════════════════════════════
// The universal questions live in lib/audit/questions.ts. They
// hold the scoring vocabulary (option `value` strings). For each
// of the 14 specific verticals, the file in this folder overrides
// the question_text, helper text, format_hint and option labels
// to read like a question the founder's own peers would ask. The
// "other" vertical inherits the universal experience.
//
// resolveQuestion(q, vertical) returns the question with the
// vertical's overlay applied. The renderer treats the result like
// any AuditQuestion; the scoring engine never sees the overlay.

import type {
  AuditQuestion,
  QuestionOverlay,
  VerticalQuestionOverlays,
  VerticalValue,
} from "@/lib/audit/types"

import { SAAS_B2B_OVERLAYS } from "./saas_b2b"
import { AGENCY_SERVICES_OVERLAYS } from "./agency_services"
import { ECOM_D2C_OVERLAYS } from "./ecom_d2c"
import { COACHING_COURSES_OVERLAYS } from "./coaching_courses"
import { MANUFACTURING_OVERLAYS } from "./manufacturing"
import { RESTAURANT_FNB_OVERLAYS } from "./restaurant_fnb"
import { RETAIL_OFFLINE_OVERLAYS } from "./retail_offline"
import { REAL_ESTATE_BROKER_OVERLAYS } from "./real_estate_broker"
import { HEALTHCARE_CLINIC_OVERLAYS } from "./healthcare_clinic"
import { EDUCATION_SCHOOL_OVERLAYS } from "./education_school"
import { EVENTS_WEDDINGS_OVERLAYS } from "./events_weddings"
import { CONSTRUCTION_INTERIOR_OVERLAYS } from "./construction_interior"
import { LOGISTICS_TRANSPORT_OVERLAYS } from "./logistics_transport"
import { PROFESSIONAL_SERVICES_OVERLAYS } from "./professional_services"

export const QUESTION_OVERLAYS: Partial<
  Record<VerticalValue, VerticalQuestionOverlays>
> = {
  saas_b2b: SAAS_B2B_OVERLAYS,
  agency_services: AGENCY_SERVICES_OVERLAYS,
  ecom_d2c: ECOM_D2C_OVERLAYS,
  coaching_courses: COACHING_COURSES_OVERLAYS,
  manufacturing: MANUFACTURING_OVERLAYS,
  restaurant_fnb: RESTAURANT_FNB_OVERLAYS,
  retail_offline: RETAIL_OFFLINE_OVERLAYS,
  real_estate_broker: REAL_ESTATE_BROKER_OVERLAYS,
  healthcare_clinic: HEALTHCARE_CLINIC_OVERLAYS,
  education_school: EDUCATION_SCHOOL_OVERLAYS,
  events_weddings: EVENTS_WEDDINGS_OVERLAYS,
  construction_interior: CONSTRUCTION_INTERIOR_OVERLAYS,
  logistics_transport: LOGISTICS_TRANSPORT_OVERLAYS,
  professional_services: PROFESSIONAL_SERVICES_OVERLAYS,
}

export function getQuestionOverlay(
  vertical: VerticalValue | null | undefined,
  qid: string,
): QuestionOverlay | null {
  if (!vertical) return null
  const v = QUESTION_OVERLAYS[vertical]
  if (!v) return null
  return v[qid] ?? null
}

// Returns a new AuditQuestion with the per-vertical overlay applied.
// Option `value` strings are preserved (scoring relies on them); only
// labels and surrounding copy change. If the question_text / helper /
// format_hint / unit / option_labels keys are missing from the overlay,
// the universal value is kept.
export function resolveQuestion(
  q: AuditQuestion,
  vertical: VerticalValue | null | undefined,
): AuditQuestion {
  const overlay = getQuestionOverlay(vertical, q.id)
  if (!overlay) return q

  // Shallow-clone the question. We then layer overlay fields on top.
  // Branching by input_type keeps TypeScript happy with the
  // discriminated-union shape.
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
