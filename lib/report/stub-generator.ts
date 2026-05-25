// Long-form founder assessment — Phase 1 STUB report generator
// ════════════════════════════════════════════════════════════
// NO LLM. NO Claude. This is a deterministic, synchronous function
// that returns a hardcoded-shape `StubReportPayload` so the rest of
// the system (approval queue, PDF render, email) can be wired end-to-end
// before Phase 3 swaps in real Claude-driven generation.
//
// Rules:
//   - Pure function (no env vars, no network, no fs).
//   - Safe to call with `answers = {}` — falls back to uniform 2.5s.
//   - Validates against StubReportPayloadSchema before returning.
//   - If validation fails, throws — this is a developer bug, not a
//     runtime user error.

import type { StubReportPayload } from "@/types/assessment"
import { computeVerdict } from "@/lib/audit/verdict"
import { FORCE_KEYS, VERTICALS, type AuditAnswers, type ForceKey } from "@/lib/audit/types"
import { StubReportPayloadSchema } from "./schema"

// ─── Inputs ──────────────────────────────────────────────────

/**
 * Minimal subset of an `audit_submissions` row that the stub reads.
 * Loose typing on `answers` because Phase 1 may run before any are
 * captured. Real AuditAnswers shape is recognised when present.
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
  "Phase 1 stub. Real generation lands in Phase 3 — for now this validates plumbing only."

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

// ─── Archetype picker (Phase 1: 4 placeholders) ──────────────

type ArchetypePick = { name: string; one_liner: string; secondary: string }

const ARCHETYPES: Record<string, { one_liner: string }> = {
  "The Grinder": {
    one_liner:
      "You out-work the problem instead of redesigning it — every win costs you a weekend you can't get back.",
  },
  "The Name": {
    one_liner:
      "The business is famous because you are. The day you stop showing up, the calendar empties.",
  },
  "The Institution": {
    one_liner:
      "Systems, not heroics. The machine produces revenue whether or not you walked in today.",
  },
  "The Rainmaker's Firm": {
    one_liner:
      "Revenue comes through one mouth — yours. Everyone else fulfills what you sold.",
  },
}

function pickArchetype(scores: Record<ForceKey, number>): ArchetypePick {
  const owner = scores.owner_energy
  const scale = scores.scale
  const xFactor = scores.x_factor
  const optimisation = scores.optimisation

  let primary: string
  let secondary: string

  if (owner < 2 && scale < 2) {
    primary = "The Grinder"
    secondary = "The Rainmaker's Firm"
  } else if (xFactor >= 4 && scale <= 3) {
    primary = "The Name"
    secondary = "The Rainmaker's Firm"
  } else if (scale >= 4 && optimisation >= 4) {
    primary = "The Institution"
    secondary = "The Rainmaker's Firm"
  } else {
    primary = "The Rainmaker's Firm"
    secondary = "The Grinder"
  }

  return {
    name: primary,
    one_liner: ARCHETYPES[primary].one_liner,
    secondary,
  }
}

// ─── Lie picker (Phase 1: 4 placeholders) ────────────────────

type LiePick = {
  name: string
  why_we_think_you_hold_this: string[]
  contradiction: string
}

function pickLie(scores: Record<ForceKey, number>): LiePick {
  if (scores.marketing < 2.5) {
    return {
      name: "The Marketing Lie",
      why_we_think_you_hold_this: [
        "Your Marketing force scores in the bottom band — position, message, and distribution are not stacked.",
        "You likely believe more spend will fix what's actually broken at the layer below it.",
        "Volume on an undecided position compounds the loss — not the wins.",
      ],
      contradiction:
        "You say you need more leads. Your numbers say you don't yet own a single sentence your customer can repeat back.",
    }
  }
  if (scores.financial < 2.5) {
    return {
      name: "The Profit Lie",
      why_we_think_you_hold_this: [
        "Your Financial force is in the bottom band — cash, margin, and runway are not clearly separated.",
        "Revenue is the loudest number on your dashboard; profit is the quietest.",
        "Money in one current account is hiding the salary, tax, and profit that should be in four.",
      ],
      contradiction:
        "You say the business is growing. Your numbers say you're underpaid and the cushion is thinner than you've admitted.",
    }
  }
  if (scores.owner_energy < 3) {
    return {
      name: "The Freedom Lie",
      why_we_think_you_hold_this: [
        "Your Owner Energy force scores below the comfort band — the calendar is collapsing first, the body will collapse second.",
        "Most decisions in the business still funnel into one inbox: yours.",
        "You're trying to fix exhaustion by adding (yoga, holidays, courses) instead of subtracting.",
      ],
      contradiction:
        "You say you've built a business. Your hours say you've built a job that pays badly and pages you on weekends.",
    }
  }
  return {
    name: "The Identity Trap",
    why_we_think_you_hold_this: [
      "Your scores cluster mid-band — no force is screaming, but none is winning either.",
      "Without a one-sentence answer to 'who is this business for?', everything downstream is a hedge.",
      "Mid-band is the most dangerous place to live — it gives you permission to keep doing what you're already doing.",
    ],
    contradiction:
      "You say you serve a specific customer. Your stop-doing list is blank — which means you've wished, not chosen.",
  }
}

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

function computeForceScores(answers: Record<string, unknown>): Record<ForceKey, number> {
  if (looksLikeAuditAnswers(answers)) {
    const verdict = computeVerdict(answers as AuditAnswers)
    const out = {} as Record<ForceKey, number>
    for (const force of FORCE_KEYS) {
      out[force] = verdict.scores[force].score
    }
    return out
  }
  // Fallback: uniform 2.5 across all forces.
  const out = {} as Record<ForceKey, number>
  for (const force of FORCE_KEYS) out[force] = FALLBACK_FORCE_SCORE
  return out
}

function pickFocusForce(scores: Record<ForceKey, number>): ForceKey {
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
    if (scores[force] < lowest) {
      lowest = scores[force]
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
 * Generate a Phase 1 stub report payload from a submission row.
 *
 * Synchronous, deterministic, pure. Phase 3 will swap this for an
 * async Claude-driven generator — the call sites can stay the same
 * shape (this returns the payload; the wrapper persists/queues it).
 */
export function generateStubReport(submission: SubmissionRow): StubReportPayload {
  const scores = computeForceScores(submission.answers)
  const focusForce = pickFocusForce(scores)
  const archetype = pickArchetype(scores)
  const lie = pickLie(scores)
  const namedMove = NAMED_MOVES[focusForce]

  // `scores` in the payload is Record<string, number> (keyed by ForceKey strings).
  const scoresOut: Record<string, number> = {}
  for (const force of FORCE_KEYS) scoresOut[force] = scores[force]

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
