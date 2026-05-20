// 7 Forces Business Audit — scoring engine
// ════════════════════════════════════════════════════════════
// Translates AuditAnswers → per-force scores → focus force + signals.
// Pure functions; deterministic. See v2-7-forces/membership/audit-scoring-rubric-v1.md
// for the rubric this implements.

import { AUDIT_QUESTIONS } from "./questions"
import type { AuditAnswer, AuditAnswers, AuditQuestion, ForceKey } from "./types"
import { FORCE_KEYS } from "./types"

// Context-only questions (excluded from scoring)
const CONTEXT_ONLY_IDS = new Set(["q8_revenue_lakhs", "q16_founder_age"])

// ─── Per-question scoring ───────────────────────────────────

// Q3 — top-3 concentration. Lower % = better.
function scoreConcentration(value: number): number {
  if (value < 20) return 5
  if (value < 40) return 4
  if (value < 60) return 3
  if (value < 80) return 2
  return 1
}

// Q11 — owner hours/week. Lower = better.
function scoreOwnerHours(value: number): number {
  if (value < 30) return 5
  if (value < 45) return 4
  if (value < 55) return 3
  if (value < 70) return 2
  return 1
}

// Q12 — headcount. Solo founder = 2 (small ≠ optimised). Team = 5.
function scoreHeadcount(value: number): number {
  if (value <= 1) return 2
  return 5
}

export function scoreQuestion(
  question: AuditQuestion,
  answer: AuditAnswer | undefined,
): number | null {
  if (CONTEXT_ONLY_IDS.has(question.id)) return null
  if (!answer) return 0

  if (question.id === "q3_top3_concentration") {
    const v = "value" in answer ? answer.value : null
    return typeof v === "number" && Number.isFinite(v) ? scoreConcentration(v) : 0
  }
  if (question.id === "q11_owner_hours") {
    const v = "value" in answer ? answer.value : null
    return typeof v === "number" && Number.isFinite(v) ? scoreOwnerHours(v) : 0
  }
  if (question.id === "q12_headcount") {
    const v = "value" in answer ? answer.value : null
    return typeof v === "number" && Number.isFinite(v) ? scoreHeadcount(v) : 0
  }

  // Choice / band: score is already baked into the saved answer.
  if ("score" in answer && typeof answer.score === "number") {
    return answer.score
  }

  return 0
}

// ─── Per-force aggregation ──────────────────────────────────

export type ForceScore = {
  score: number // 0–5, one decimal
  n: number // number of scoring questions in this force
  untracked: number // number of those answered as untracked
}

export function scoreForce(answers: AuditAnswers, force: ForceKey): ForceScore {
  const questions = AUDIT_QUESTIONS.filter(
    (q) => q.force === force && !CONTEXT_ONLY_IDS.has(q.id),
  )
  let total = 0
  let n = 0
  let untracked = 0
  for (const q of questions) {
    const a = answers[q.id]
    const score = scoreQuestion(q, a)
    if (score === null) continue
    total += score
    n += 1
    if (a && "untracked" in a && a.untracked) untracked += 1
  }
  const score = n > 0 ? Math.round((total / n) * 10) / 10 : 0
  return { score, n, untracked }
}

export type ForceScores = Record<ForceKey, ForceScore>

export function scoreAllForces(answers: AuditAnswers): ForceScores {
  const result = {} as ForceScores
  for (const force of FORCE_KEYS) {
    result[force] = scoreForce(answers, force)
  }
  return result
}

// ─── Q9 × Q17 combination rule ──────────────────────────────
// Headline gross margin can mask a business that's bleeding to
// acquire customers. A coaching business with 60% GM and 50%
// marketing spend has 10% net contribution — fundamentally
// fragile. Catches the "looks profitable, isn't" failure mode.

const GM_BAND_MIDPOINT: Record<string, number> = {
  gt_70: 85,
  "50_70": 60,
  "30_50": 40,
  "15_30": 22.5,
  lt_15: 10,
}

const MARKETING_BAND_MIDPOINT: Record<string, number> = {
  lt_5: 3,
  "5_15": 10,
  "15_30": 22.5,
  "30_50": 40,
  gt_50: 60,
}

export type MarketingBurnAdjustment = {
  applied: boolean
  net_contribution: number | null
  penalty: number
  signal_text: string | null
}

export function evaluateMarketingBurn(
  answers: AuditAnswers,
): MarketingBurnAdjustment {
  const q9 = answers["q9_gross_margin"]
  const q17 = answers["q17_marketing_spend"]
  if (!q9 || !q17) {
    return { applied: false, net_contribution: null, penalty: 0, signal_text: null }
  }
  if (("untracked" in q9 && q9.untracked) || ("untracked" in q17 && q17.untracked)) {
    return { applied: false, net_contribution: null, penalty: 0, signal_text: null }
  }
  const gmValue = "value" in q9 ? String(q9.value) : null
  const mktValue = "value" in q17 ? String(q17.value) : null
  if (!gmValue || !mktValue) {
    return { applied: false, net_contribution: null, penalty: 0, signal_text: null }
  }
  const gm = GM_BAND_MIDPOINT[gmValue]
  const mkt = MARKETING_BAND_MIDPOINT[mktValue]
  if (typeof gm !== "number" || typeof mkt !== "number") {
    return { applied: false, net_contribution: null, penalty: 0, signal_text: null }
  }

  const net = gm - mkt
  let penalty = 0
  let signal_text: string | null = null
  if (net < 15) {
    penalty = 1.5
    signal_text = `Net contribution around ~${Math.max(0, Math.round(net))}% — gross margin looks fine, but marketing burns most of it.`
  } else if (net < 30) {
    penalty = 0.5
    signal_text = `Net contribution around ~${Math.round(net)}% — marketing is eating into margin; growth has to stay disciplined.`
  }
  return {
    applied: penalty > 0,
    net_contribution: net,
    penalty,
    signal_text,
  }
}

export function applyMarketingBurnPenalty(
  scores: ForceScores,
  adjustment: MarketingBurnAdjustment,
): ForceScores {
  if (!adjustment.applied) return scores
  const adjusted = Math.max(
    1,
    Math.round((scores.financial.score - adjustment.penalty) * 10) / 10,
  )
  return {
    ...scores,
    financial: { ...scores.financial, score: adjusted },
  }
}

// ─── Focus force picker ─────────────────────────────────────

// Tiebreaker order when 2+ forces score within 0.3 of the lowest.
// Foundation first (Identity → X-Factor → Financial → Marketing → Sales → Optimisation → Scale → Owner Energy).
const TIEBREAKER_PRIORITY: readonly ForceKey[] = [
  "identity",
  "x_factor",
  "financial",
  "marketing",
  "sales",
  "optimisation",
  "scale",
  "owner_energy",
]

// Q13 user-felt bottleneck → tagged force
const Q13_TAG_MAP: Record<string, ForceKey> = {
  owner_time: "owner_energy",
  team: "scale",
  systems: "optimisation",
  cash: "financial",
  supply: "scale",
  // "nothing" → no tag (celebrate)
}

const TIEBREAKER_BAND = 0.3
const Q13_BOOST_BAND = 0.5

export function pickFocusForce(scores: ForceScores, answers: AuditAnswers): ForceKey {
  let minScore = Infinity
  for (const force of FORCE_KEYS) {
    if (scores[force].score < minScore) minScore = scores[force].score
  }

  const candidates = FORCE_KEYS.filter(
    (f) => scores[f].score - minScore <= TIEBREAKER_BAND,
  )

  // Q13 boost: user-felt bottleneck wins if within 0.5 of the lowest
  const q13 = answers["q13_bottleneck"]
  const q13Value = q13 && "value" in q13 ? String(q13.value) : null
  const taggedForce = q13Value ? Q13_TAG_MAP[q13Value] : null
  if (taggedForce && scores[taggedForce].score - minScore <= Q13_BOOST_BAND) {
    return taggedForce
  }

  for (const force of TIEBREAKER_PRIORITY) {
    if (candidates.includes(force)) return force
  }
  return candidates[0] ?? "identity"
}

// ─── Signal extraction ──────────────────────────────────────

export type Signal = {
  question_id: string
  force: ForceKey
  text: string
}

export type Signals = {
  strengths: Signal[]
  risks: Signal[]
  blind_spots: Signal[]
}

const STRENGTH_THRESHOLD = 4
const RISK_THRESHOLD = 1
const MAX_PER_LIST = 3

export function extractSignals(answers: AuditAnswers): Signals {
  const strengths: Signal[] = []
  const risks: Signal[] = []
  const blind_spots: Signal[] = []

  for (const q of AUDIT_QUESTIONS) {
    const a = answers[q.id]
    if (!a) continue

    // Blind spots: untracked answers (regardless of score).
    if ("untracked" in a && a.untracked) {
      blind_spots.push({
        question_id: q.id,
        force: q.force,
        text: untrackedText(q.id),
      })
      continue
    }

    const score = scoreQuestion(q, a)
    if (score === null) continue

    if (score >= STRENGTH_THRESHOLD) {
      const text = strengthText(q.id)
      if (text) strengths.push({ question_id: q.id, force: q.force, text })
    } else if (score <= RISK_THRESHOLD) {
      const text = riskText(q.id, a)
      if (text) risks.push({ question_id: q.id, force: q.force, text })
    }
  }

  const byForcePriority = (a: Signal, b: Signal) =>
    TIEBREAKER_PRIORITY.indexOf(a.force) - TIEBREAKER_PRIORITY.indexOf(b.force)

  return {
    strengths: strengths.sort(byForcePriority).slice(0, MAX_PER_LIST),
    risks: risks.sort(byForcePriority).slice(0, MAX_PER_LIST),
    blind_spots: blind_spots.sort(byForcePriority).slice(0, MAX_PER_LIST),
  }
}

function strengthText(qid: string): string | null {
  switch (qid) {
    case "q1_icp_clarity":
      return "You can name your ideal customer with specificity — most founders can't."
    case "q2_xfactor_source":
      return "You've asked your customers why they pick you — and you have words for it."
    case "q3_top3_concentration":
      return "Your revenue is diversified — no single customer can sink the boat."
    case "q4_lead_source":
      return "Your customers come from a real, named channel — not luck."
    case "q5_cpl":
      return "Your cost per lead is in a healthy range."
    case "q6_conversion":
      return "Your conversion rate is strong — leads that come in turn into customers."
    case "q7_sales_cycle":
      return "You close fast — cash conversion is quick."
    case "q9_gross_margin":
      return "Your gross margin is healthy — there's room to invest in growth."
    case "q10_cash_runway":
      return "You have meaningful cash runway."
    case "q11_owner_hours":
      return "Your working hours are reasonable — the business doesn't depend on you grinding."
    case "q12_headcount":
      return "You've built a team — not running solo anymore."
    case "q13_bottleneck":
      return "You believe nothing breaks at 3x demand — capacity exists."
    case "q14_owner_energy":
      return "You feel energised walking into the business."
    case "q15_decision_making":
      return "Decision-making is distributed across your team."
    case "q17_marketing_spend":
      return "Your acquisition spend is lean — most revenue stays inside the business."
    case "q18_monthly_churn":
      return "Your churn is in healthy territory — retention is doing the compounding for you."
    case "q18_repeat_rate":
      return "Most of your revenue comes from people who already chose you — strong loyalty signal."
    case "q18_aggregator_share":
      return "Your aggregator exposure is low — you own your customer relationship."
    case "q18_capacity_util":
      return "Your seats/slots are well utilised — assets are working hard."
    case "q18_dso_days":
      return "Customers pay you quickly — your cash conversion cycle is tight."
    default:
      return null
  }
}

function riskText(qid: string, a: AuditAnswer): string | null {
  switch (qid) {
    case "q1_icp_clarity":
      return "You can't name a specific ideal customer — everything downstream is harder."
    case "q2_xfactor_source":
      return "You haven't asked your customers why they chose you — you're guessing."
    case "q3_top3_concentration": {
      const v = "value" in a && typeof a.value === "number" ? a.value : null
      const pct = v !== null ? `${Math.round(v)}%` : "a high %"
      return `Concentration risk: ${pct} of revenue from your top 3. One leaving = a crisis.`
    }
    case "q4_lead_source":
      return "You don't know where customers come from — growth depends on luck."
    case "q5_cpl":
      return "Your cost per lead is high — marketing economics are stretched."
    case "q6_conversion":
      return "Fewer than 2 in 10 enquiries close — leakage in the sales process."
    case "q7_sales_cycle":
      return "Sales take months — cash conversion is slow."
    case "q9_gross_margin":
      return "Your gross margin is thin — growth makes the leak bigger, not smaller."
    case "q10_cash_runway":
      return "Less than a month of runway — every decision is a survival decision."
    case "q11_owner_hours":
      return "You work over 70 hours/week — you are the business, and that's the trap."
    case "q13_bottleneck":
      return "You've named what breaks at 3x — fix it before any growth investment."
    case "q14_owner_energy":
      return "You walk in drained or done — the upstream forces have collapsed onto you."
    case "q15_decision_making":
      return "Nothing moves without you — you don't run the business, it runs you."
    case "q17_marketing_spend":
      return "Over half your revenue goes to acquiring customers — the business runs on the ad-spend treadmill."
    case "q18_monthly_churn":
      return "Customers leave faster than you can replace them — growth is a leaky bucket."
    case "q18_repeat_rate":
      return "Almost everyone is a first-time buyer — you have a product, not yet a brand."
    case "q18_aggregator_share":
      return "Most of your revenue routes through aggregators — they own the customer, not you."
    case "q18_capacity_util":
      return "Capacity is sitting empty — every fixed cost is hitting fewer covers."
    case "q18_dso_days":
      return "Money sits in receivables for months — you're financing your customers' working capital."
    default:
      return null
  }
}

function untrackedText(qid: string): string {
  switch (qid) {
    case "q5_cpl":
      return "You don't track cost per lead. Until you do, marketing is gambling — not investment."
    case "q6_conversion":
      return "You don't track conversion. You cannot fix a number you cannot see."
    case "q9_gross_margin":
      return "You don't know your gross margin. Pricing decisions are flying blind."
    case "q10_cash_runway":
      return "You don't know your cash runway. The number that decides everything is unknown."
    case "q17_marketing_spend":
      return "You don't track marketing as a % of revenue. Without it, you can't tell whether growth is buying customers or burning cash."
    case "q18_monthly_churn":
      return "You don't track monthly churn. The leak in the bucket is invisible — and bigger than you think."
    case "q18_repeat_rate":
      return "You don't track repeat-customer revenue. You can't tell if you're building a brand or just buying transactions."
    case "q18_aggregator_share":
      return "You don't track aggregator share of revenue. The platform's leverage over you is hidden."
    case "q18_capacity_util":
      return "You don't track utilisation. Empty seats are silent — they don't show up till the month-end P&L."
    case "q18_dso_days":
      return "You don't track receivables days. You're financing your customers and you don't know how much."
    default:
      return "You marked this as untracked — measurement before optimisation."
  }
}
