// Long-form founder assessment — Phase 2 STUB report generator
// ════════════════════════════════════════════════════════════
// NO LLM. NO Claude. This is a deterministic, synchronous function
// that returns a hardcoded-shape `StubReportPayload` so the rest of
// the system (approval queue, PDF render, email) can be wired end-to-end
// before Phase 3 swaps in real Claude-driven generation.
//
// Phase 2 upgrade: archetype + Lie are now picked by the deterministic
// engines in `lib/assessment/*` (assignArchetype, assignLie) instead of
// hardcoded heuristics. Force scores come from the long-form bank via
// `scoreAllAssessmentForces`. The named_move lookup is still keyed by
// the lowest-scoring force — good enough for Phase 2.
//
// Rules:
//   - Pure function (no env vars, no network, no fs).
//   - Safe to call with `answers = {}` — falls back to uniform 2.5s.
//   - Validates against StubReportPayloadSchema before returning.
//   - If validation fails, throws — this is a developer bug, not a
//     runtime user error.

import type { StubReportPayload } from "@/types/assessment"
import {
  FORCE_KEYS,
  VERTICALS,
  type AuditAnswers,
  type ForceKey,
} from "@/lib/audit/types"
import {
  scoreAllAssessmentForces,
  type ForceScores,
} from "@/lib/assessment/scoring"
import { assignArchetype, ARCHETYPES } from "@/lib/assessment/archetype"
import { assignLie, LIES } from "@/lib/assessment/lie"
import { StubReportPayloadSchema } from "./schema"

// ─── Inputs ──────────────────────────────────────────────────

/**
 * Minimal subset of an `audit_submissions` row that the stub reads.
 * Loose typing on `answers` because Phase 1/2 may run before any are
 * captured. Real AuditAnswers shape is recognised when present.
 *
 * Note: `vertical_label` is derived from `vertical` via VERTICALS — the
 * caller does not need to supply it.
 */
export type SubmissionRow = {
  id: string
  full_name: string
  business_name: string
  email: string
  phone: string | null
  city: string | null
  vertical: string
  answers: Record<string, unknown>
}

// ─── Constants ───────────────────────────────────────────────

const STUB_NOTE =
  "Phase 2 stub. Real archetype and Lie picked deterministically from your answers. Full Claude-driven report content lands in Phase 3."

const FORCE_LABELS: Record<ForceKey, string> = {
  identity: "Identity",
  x_factor: "X-Factor",
  marketing: "Marketing",
  sales: "Sales",
  financial: "Financial",
  optimisation: "Optimisation",
  scale: "Scale",
  owner_energy: "Owner Energy",
}

// Uniform fallback when the founder has no real answers yet.
const FALLBACK_FORCE_SCORE = 2.5

// ─── Named move lookup (keyed by focus force) ────────────────

type NamedMovePick = { title: string; promise: string; target_metric: string }

const NAMED_MOVES: Record<ForceKey, NamedMovePick> = {
  identity: {
    title: "The One-Customer Cut",
    promise:
      "A one-sentence answer to 'who is this business for?' that names a specific person, a specific problem, and a specific trigger.",
    target_metric: "Three customers fired, three products killed, three work types refused — in 60 days.",
  },
  x_factor: {
    title: "The Refusal Sprint",
    promise:
      "One sentence — in your customers' own words — explaining why they refuse the cheaper alternative.",
    target_metric: "No single customer above 25% of revenue inside 12 months.",
  },
  marketing: {
    title: "The Marketing Stack Sprint",
    promise:
      "One word you own, one sentence your customer can repeat back, and one distribution method producing engaged leads at a known cost.",
    target_metric: "100 primary actions/day in one channel; known cost per engaged lead.",
  },
  sales: {
    title: "The Sales Stack Rebuild",
    promise:
      "An offer your prospect can't compare on price, and a 5-question investigation that makes the buyer state their own urgency.",
    target_metric: "Every conversation ends in yes, dated next action, or clean no — for 30 days straight.",
  },
  financial: {
    title: "The Cash & Margin Reset",
    promise:
      "Your true gross margin per rupee of revenue, your real owner-inclusive profit margin, and the months of runway sitting in cash.",
    target_metric: "₹1.80 of gross profit per ₹1.00 of salary — including your own.",
  },
  optimisation: {
    title: "The Bottleneck Sprint",
    promise:
      "Name the one chokepoint pacing your business, remove 10–15 hours/week of the lowest-leverage work from your calendar.",
    target_metric: "Three tasks killed forever; one handover written; one process running without you for two weeks.",
  },
  scale: {
    title: "The Break-Point Audit",
    promise:
      "Name the one thing that breaks at 3x demand, and remove yourself from one critical seat.",
    target_metric: "A 7-day stretch where you don't touch operations — and the business doesn't break.",
  },
  owner_energy: {
    title: "The Decision Diet",
    promise:
      "Remove 50% of the daily decisions sitting on your head; defend one 90-minute deep-work block five days a week.",
    target_metric: "One full day per week where the business runs without you.",
  },
}

// ─── Helpers ─────────────────────────────────────────────────

function looksLikeAuditAnswers(answers: Record<string, unknown>): boolean {
  if (!answers || typeof answers !== "object") return false
  const keys = Object.keys(answers)
  if (keys.length === 0) return false
  // Heuristic: at least one entry is an object that contains "value" or "score".
  for (const k of keys) {
    const v = answers[k]
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as Record<string, unknown>
      if ("value" in o || "score" in o) return true
    }
  }
  return false
}

// Build a uniform ForceScores fallback (every force at 2.5 / no questions
// answered) so downstream consumers always get a real ForceScores shape.
function fallbackForceScores(): ForceScores {
  const out = {} as ForceScores
  for (const force of FORCE_KEYS) {
    out[force] = { score: FALLBACK_FORCE_SCORE, n: 0, untracked: 0 }
  }
  return out
}

function pickFocusForce(flatScores: Record<ForceKey, number>): ForceKey {
  // Lowest-scoring force wins; on tie, foundation order.
  // Same priority as scoring.ts TIEBREAKER_PRIORITY.
  const order: readonly ForceKey[] = [
    "identity",
    "x_factor",
    "financial",
    "marketing",
    "sales",
    "optimisation",
    "scale",
    "owner_energy",
  ]
  let pick: ForceKey = order[0]
  let lowest = Infinity
  for (const force of order) {
    if (flatScores[force] < lowest) {
      lowest = flatScores[force]
      pick = force
    }
  }
  return pick
}

function verticalLabelFor(value: string): string {
  const match = VERTICALS.find((v) => v.value === value)
  return match?.label ?? value
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Generate a Phase 2 stub report payload from a submission row.
 *
 * Synchronous, deterministic, pure. Phase 3 will swap this for an
 * async Claude-driven generator — the call sites can stay the same
 * shape (this returns the payload; the wrapper persists/queues it).
 */
export function generateStubReport(submission: SubmissionRow): StubReportPayload {
  // ─── Score forces (long-form bank) ─────────────────────────
  // scoreAllAssessmentForces tolerates an empty answers object — every
  // force will come back with score=0, n=0. To keep the Phase 1
  // "feels neutral when nothing's been answered" behaviour, fall back
  // to a uniform 2.5 if we can't see any audit-shaped answers at all.
  const scores: ForceScores = looksLikeAuditAnswers(submission.answers)
    ? scoreAllAssessmentForces(submission.answers as AuditAnswers)
    : fallbackForceScores()

  // Flat numbers for downstream consumers (focus-force picker + payload).
  const flatScores: Record<ForceKey, number> = {} as Record<ForceKey, number>
  for (const force of FORCE_KEYS) flatScores[force] = scores[force].score

  // ─── Archetype + Lie (deterministic engines) ───────────────
  const answersForEngines = (
    looksLikeAuditAnswers(submission.answers)
      ? (submission.answers as AuditAnswers)
      : ({} as AuditAnswers)
  )
  const archetypeResult = assignArchetype(scores, answersForEngines)
  const lieResult = assignLie(scores, answersForEngines)

  const archetypeProfile = ARCHETYPES[archetypeResult.primary]
  const archetype = {
    name: archetypeProfile.label,
    one_liner: archetypeProfile.one_liner,
    secondary: archetypeResult.secondary
      ? ARCHETYPES[archetypeResult.secondary].label
      : "—",
  }

  const lieProfile = LIES[lieResult.primary]
  // Schema requires ≥ 1 evidence string. If the engine returned none
  // (e.g. blank answers + a fallback Lie), surface the short_diagnosis
  // so the payload still validates.
  const whyWeThink: string[] =
    lieResult.evidence.length > 0
      ? lieResult.evidence
      : [lieProfile.short_diagnosis]

  const lie = {
    name: lieProfile.label,
    why_we_think_you_hold_this: whyWeThink,
    contradiction: lieResult.contradiction,
  }

  // ─── Focus force → named move ──────────────────────────────
  const focusForce = pickFocusForce(flatScores)
  const namedMove = NAMED_MOVES[focusForce]

  // `scores` in the payload is Record<string, number> (keyed by ForceKey strings).
  const scoresOut: Record<string, number> = {}
  for (const force of FORCE_KEYS) scoresOut[force] = flatScores[force]

  const payload: StubReportPayload = {
    version: "1-stub",
    founder: {
      full_name: submission.full_name,
      business_name: submission.business_name,
      vertical: submission.vertical,
      vertical_label: verticalLabelFor(submission.vertical),
    },
    archetype,
    lie,
    scores: scoresOut,
    named_move: namedMove,
    generated_at: new Date().toISOString(),
    stub_note: STUB_NOTE,
  }

  // Validate before returning. A failure here is a developer bug — throw.
  const parsed = StubReportPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(
      `generateStubReport produced an invalid StubReportPayload — this is a developer bug. ` +
        `Validation issues: ${JSON.stringify(parsed.error.issues)}`,
    )
  }

  // Use the parsed value (defensive — parsed shape matches StubReportPayload).
  // The cast is safe because the schema mirrors the type exactly.
  return parsed.data as unknown as StubReportPayload
}

// Re-export the focus picker so the PDF renderer (and tests) can use
// the same logic without duplicating the tiebreaker order.
export { pickFocusForce as pickStubFocusForce, FORCE_LABELS as STUB_FORCE_LABELS }
