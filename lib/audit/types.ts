// 7 Forces Business Audit — shared types
// ════════════════════════════════════════════════════════════

export const FORCE_KEYS = [
  "identity",
  "x_factor",
  "marketing",
  "sales",
  "financial",
  "optimisation",
  "scale",
  "owner_energy",
] as const

export type ForceKey = (typeof FORCE_KEYS)[number]

export const VERTICALS = [
  { value: "saas_b2b", label: "SaaS / B2B Software" },
  { value: "agency_services", label: "Agency / Consulting / Services" },
  { value: "ecom_d2c", label: "E-commerce / D2C" },
  { value: "coaching_courses", label: "Coaching / Courses / Info-products" },
  { value: "manufacturing", label: "Manufacturing / Trading" },
  { value: "restaurant_fnb", label: "Restaurant / F&B" },
  { value: "retail_offline", label: "Retail (offline)" },
  { value: "real_estate_broker", label: "Real Estate / Broking" },
  { value: "healthcare_clinic", label: "Healthcare / Clinic / Wellness" },
  { value: "education_school", label: "School / Tuition / Education" },
  { value: "events_weddings", label: "Events / Weddings" },
  { value: "construction_interior", label: "Construction / Interior Design" },
  { value: "logistics_transport", label: "Logistics / Transport" },
  { value: "professional_services", label: "Lawyer / CA / Doctor / Solo Pro" },
  { value: "other", label: "Other" },
] as const

export type VerticalValue = (typeof VERTICALS)[number]["value"]

// ─── Question input types ───────────────────────────────────

export type ChoiceOption = {
  label: string
  value: string
  score: number
  untracked?: boolean
}

export type ChoiceQuestion = {
  id: string
  force: ForceKey
  question_text: string
  input_type: "choice"
  options: ChoiceOption[]
  confidence_required?: boolean
  helper?: string
}

export type BandQuestion = {
  id: string
  force: ForceKey
  question_text: string
  input_type: "band"
  options: ChoiceOption[] // bands rendered same as choices; "I don't track this" has untracked=true
  unit?: string
  confidence_required?: boolean
  helper?: string
}

export type NumberQuestion = {
  id: string
  force: ForceKey
  question_text: string
  input_type: "number"
  unit: string
  min_value: number
  max_value: number
  format_hint?: string
  confidence_required?: boolean
  helper?: string
}

export type AuditQuestion = ChoiceQuestion | BandQuestion | NumberQuestion

// ─── Question overlays (per-vertical question forks) ──────────
// Universal questions stay in questions.ts. Per-vertical wording,
// helper text, and option labels live in lib/audit/question-overlays/.
// Option `value` strings MUST stay identical to the universal
// version — only labels and surrounding text are overridden. This
// keeps the scoring engine and answer storage vertical-agnostic.

export type QuestionOverlay = {
  question_text?: string
  helper?: string
  format_hint?: string
  unit?: string
  option_labels?: Record<string, string> // keyed by base option `value`
}

export type VerticalQuestionOverlays = Partial<Record<string, QuestionOverlay>>

// ─── Identity block ────────────────────────────────────────

export type IdentityBlock = {
  full_name: string
  business_name: string
  phone: string
  email: string
  city: string
  vertical: VerticalValue
}

// ─── Answers ───────────────────────────────────────────────

export type Confidence = "sure" | "approx" | "guess"

export type ChoiceAnswer = {
  value: string
  score: number
  confidence?: Confidence
}

export type BandAnswer = {
  value: string
  score: number
  confidence?: Confidence
  untracked?: boolean
}

export type NumberAnswer = {
  value: number
  unit: string
  confidence?: Confidence
}

export type AuditAnswer = ChoiceAnswer | BandAnswer | NumberAnswer

export type AuditAnswers = Record<string, AuditAnswer>

// ─── Submission payload (POSTed to /api/audit/submit) ──────

export type AuditSubmissionPayload = {
  identity: IdentityBlock
  answers: AuditAnswers
}
