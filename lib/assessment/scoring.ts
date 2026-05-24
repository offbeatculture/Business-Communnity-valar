// Long-form assessment — scoring engine extension
// ════════════════════════════════════════════════════════════
// Extends lib/audit/scoring.ts with special handling for the
// 78-question long-form bank (Q19–Q89 + cross-force QX1–QX6).
//
// Most new questions score via the universal answer.score path
// (already handled by lib/audit/scoring.ts#scoreQuestion). Only
// a small set need bespoke logic:
//   - Q55 × Q56 → "Crabtree gap" (owner salary vs replacement wage)
//   - Q56 alone → context-only (only used in combination with Q55)
//
// Pure + deterministic; no LLM, no fetch.

import {
  scoreQuestion as scoreUniversalQuestion,
  type ForceScore,
  type ForceScores,
  type MarketingBurnAdjustment,
  evaluateMarketingBurn,
  applyMarketingBurnPenalty,
} from "@/lib/audit/scoring"
import type {
  AuditAnswer,
  AuditAnswers,
  AuditQuestion,
  ForceKey,
} from "@/lib/audit/types"
import { FORCE_KEYS } from "@/lib/audit/types"
import { ASSESSMENT_QUESTIONS } from "./questions"

// Re-export so consumers have one import surface.
export type { ForceScore, ForceScores, MarketingBurnAdjustment }
export { evaluateMarketingBurn, applyMarketingBurnPenalty }

// ─── Context-only questions for the long-form bank ──────────
// These are referenced by other questions but do not contribute
// a standalone score.
const ASSESSMENT_CONTEXT_ONLY_IDS = new Set<string>([
  "q56_bus_test_wage", // used only as denominator for Q55 Crabtree gap
  "qx1_first_fix_priority", // signal-only by design (see question bank)
])

// ─── Q55 × Q56 Crabtree gap scorer ──────────────────────────
// Owner salary (Q55) judged against the replacement-wage you'd
// have to pay if hit by a bus (Q56). Maps the ratio to 0–5.
function scoreCrabtreeGap(
  q55: AuditAnswer | undefined,
  q56: AuditAnswer | undefined,
): number {
  const salary =
    q55 && "value" in q55 && typeof q55.value === "number" && Number.isFinite(q55.value)
      ? q55.value
      : null
  const busWage =
    q56 && "value" in q56 && typeof q56.value === "number" && Number.isFinite(q56.value)
      ? q56.value
      : null

  // No Q56 → fall back to "no signal" (treat as 0, like other unanswered).
  if (salary === null) return 0
  if (busWage === null || busWage <= 0) {
    // Q56 missing or zero: can't compute the gap. Treat as 0.
    return 0
  }
  if (salary <= 0) return 0

  const ratio = salary / busWage
  if (ratio >= 0.7) return 5
  if (ratio >= 0.4) return 3
  if (ratio >= 0.1) return 1
  return 0
}

// ─── Per-question scoring ───────────────────────────────────
/**
 * Long-form-aware question scorer. Falls back to the universal
 * audit scorer for everything not specially handled here.
 */
export function scoreAssessmentQuestion(
  question: AuditQuestion,
  answer: AuditAnswer | undefined,
  allAnswers: AuditAnswers,
): number | null {
  if (ASSESSMENT_CONTEXT_ONLY_IDS.has(question.id)) return null

  if (question.id === "q55_owner_salary") {
    return scoreCrabtreeGap(answer, allAnswers["q56_bus_test_wage"])
  }

  return scoreUniversalQuestion(question, answer)
}

// ─── Per-force aggregation ──────────────────────────────────
/**
 * Per-force aggregator using scoreAssessmentQuestion. Returns
 * ForceScore (score 0–5 one decimal, n questions, untracked count).
 */
export function scoreAssessmentForce(
  answers: AuditAnswers,
  force: ForceKey,
): ForceScore {
  const questions = ASSESSMENT_QUESTIONS.filter(
    (q) => q.force === force && !ASSESSMENT_CONTEXT_ONLY_IDS.has(q.id),
  )
  let total = 0
  let n = 0
  let untracked = 0
  for (const q of questions) {
    const a = answers[q.id]
    const score = scoreAssessmentQuestion(q, a, answers)
    if (score === null) continue
    total += score
    n += 1
    if (a && "untracked" in a && a.untracked) untracked += 1
  }
  const score = n > 0 ? Math.round((total / n) * 10) / 10 : 0
  return { score, n, untracked }
}

/**
 * Score ALL forces over the long-form bank.
 */
export function scoreAllAssessmentForces(answers: AuditAnswers): ForceScores {
  const result = {} as ForceScores
  for (const force of FORCE_KEYS) {
    result[force] = scoreAssessmentForce(answers, force)
  }
  return result
}

// ─── Self-perception vs reality tensions ────────────────────
/**
 * A "tension" pairs a self-rating (Q25/Q35/Q45/Q54/Q63/Q72) against
 * the founder's concrete behavioural answers. Fires when the two
 * disagree by ≥ 2 points in either direction.
 */
export type Tension = {
  force: ForceKey
  self_rated_qid: string
  evidence_qids: string[]
  description: string
}

type TensionPair = {
  force: ForceKey
  self_rated_qid: string
  evidence_qids: string[]
  self_label: string // what the founder *says* the force is about
}

const TENSION_PAIRS: readonly TensionPair[] = [
  {
    force: "identity",
    self_rated_qid: "q25_self_rated_identity_clarity",
    evidence_qids: ["q19_business_naming", "q24_customer_change_named"],
    self_label: "identity clarity",
  },
  {
    force: "x_factor",
    self_rated_qid: "q35_self_rated_xfactor_strength",
    evidence_qids: ["q34_uncopyable_proof", "q33_referral_sentence"],
    self_label: "X-Factor strength",
  },
  {
    force: "marketing",
    self_rated_qid: "q45_self_rated_position_clarity",
    evidence_qids: ["q38_customer_one_liner", "q37_two_word_position"],
    self_label: "position clarity",
  },
  {
    force: "sales",
    self_rated_qid: "q54_self_rated_close_skill",
    evidence_qids: ["q6_conversion", "q52_continuation_count"],
    self_label: "close skill",
  },
  {
    force: "financial",
    self_rated_qid: "q63_self_rated_financial_clarity",
    evidence_qids: ["q57_corrected_pretax", "q59_profit_allocation"],
    self_label: "financial clarity",
  },
  {
    force: "optimisation",
    self_rated_qid: "q72_self_rated_bottleneck_clarity",
    evidence_qids: ["q64_herbie_named", "q65_effort_location"],
    self_label: "bottleneck clarity",
  },
]

// Self-rating qids store a 1-5 scale as the option's score field.
function selfRatingScore(answer: AuditAnswer | undefined): number | null {
  if (!answer) return null
  if (!("score" in answer) || typeof answer.score !== "number") return null
  return answer.score
}

// Compute the mean score of evidence Qs that are answered.
function evidenceAverage(
  answers: AuditAnswers,
  qids: readonly string[],
): { avg: number | null; counted: number } {
  let total = 0
  let counted = 0
  for (const qid of qids) {
    const q = ASSESSMENT_QUESTIONS.find((x) => x.id === qid)
    if (!q) continue
    const a = answers[qid]
    if (!a) continue
    const score = scoreAssessmentQuestion(q, a, answers)
    if (score === null) continue
    total += score
    counted += 1
  }
  if (counted === 0) return { avg: null, counted: 0 }
  return { avg: total / counted, counted }
}

/**
 * Detect self-perception vs reality contradictions. A "tension"
 * fires when the self-rating is ≥ 4 but the cross-check answers
 * average ≤ 2 (or vice versa).
 */
export function detectTensions(answers: AuditAnswers): Tension[] {
  const tensions: Tension[] = []
  for (const pair of TENSION_PAIRS) {
    const selfScore = selfRatingScore(answers[pair.self_rated_qid])
    if (selfScore === null) continue
    const { avg, counted } = evidenceAverage(answers, pair.evidence_qids)
    if (avg === null || counted === 0) continue

    if (selfScore >= 4 && avg <= 2) {
      tensions.push({
        force: pair.force,
        self_rated_qid: pair.self_rated_qid,
        evidence_qids: pair.evidence_qids.filter((qid) => answers[qid]),
        description: `You rate your ${pair.self_label} at ${selfScore}/5, but your concrete answers average ${avg.toFixed(1)}/5 — the self-perception is running ahead of the evidence.`,
      })
    } else if (selfScore <= 2 && avg >= 4) {
      tensions.push({
        force: pair.force,
        self_rated_qid: pair.self_rated_qid,
        evidence_qids: pair.evidence_qids.filter((qid) => answers[qid]),
        description: `You rate your ${pair.self_label} at ${selfScore}/5, but your concrete answers average ${avg.toFixed(1)}/5 — you're being harder on yourself than the numbers say.`,
      })
    }
  }
  return tensions
}
