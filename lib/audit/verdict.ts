// 7 Forces Business Audit — verdict composer
// ════════════════════════════════════════════════════════════
// One function: computeVerdict(answers) → full verdict object.
// Re-runs deterministically — no caching. Tweak scoring.ts or
// playbook.ts and the verdict for any submission updates on next read.

import {
  scoreAllForces,
  pickFocusForce,
  extractSignals,
  evaluateMarketingBurn,
  applyMarketingBurnPenalty,
  type ForceScore,
  type ForceScores,
  type Signals,
} from "./scoring"
import { PLAYBOOKS, type Playbook } from "./playbook"
import type { AuditAnswers, ForceKey } from "./types"

export type AuditContext = {
  revenue_lakhs: number | null
  headcount: number | null
  founder_age: number | null
  stage_tag: "pre-1Cr" | "1Cr-5Cr" | "5Cr-25Cr" | "25Cr+" | null
}

export type AuditVerdict = {
  scores: ForceScores
  focus_force: ForceKey
  focus_force_label: string
  focus_reason: string
  named_move: Playbook
  signals: Signals
  context: AuditContext
}

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

function numericAnswerValue(answers: AuditAnswers, qid: string): number | null {
  const a = answers[qid]
  if (!a || !("value" in a)) return null
  return typeof a.value === "number" && Number.isFinite(a.value) ? a.value : null
}

function deriveStageTag(revenue_lakhs: number | null): AuditContext["stage_tag"] {
  if (revenue_lakhs === null) return null
  if (revenue_lakhs < 100) return "pre-1Cr"
  if (revenue_lakhs < 500) return "1Cr-5Cr"
  if (revenue_lakhs < 2500) return "5Cr-25Cr"
  return "25Cr+"
}

function buildFocusReason(
  force: ForceKey,
  score: ForceScore,
  signals: Signals,
): string {
  const label = FORCE_LABELS[force]
  const scoreStr = score.score.toFixed(1)
  const untrackedNote =
    score.untracked > 0
      ? ` ${score.untracked} of ${score.n} answer${score.n > 1 ? "s" : ""} here ${
          score.untracked > 1 ? "are" : "is"
        } a blind spot.`
      : ""
  const riskInForce = signals.risks.find((r) => r.force === force)
  const riskNote = riskInForce ? ` ${riskInForce.text}` : ""

  return `Your ${label} force scores ${scoreStr} / 5 — the lowest across all 8 forces, and the named move you most need over the next 90 days.${untrackedNote}${riskNote}`
}

export function computeVerdict(answers: AuditAnswers): AuditVerdict {
  // 1) Raw scoring from per-question answers.
  const rawScores = scoreAllForces(answers)

  // 2) Q9 × Q17 combination: penalise financial when marketing eats GM.
  const burn = evaluateMarketingBurn(answers)
  const scores = applyMarketingBurnPenalty(rawScores, burn)

  // 3) Pick the focus force from adjusted scores (so a marketing-burn
  //    business has Financial as a real candidate even with healthy GM).
  const focus_force = pickFocusForce(scores, answers)
  const named_move = PLAYBOOKS[focus_force]

  // 4) Extract signals, then inject the burn risk if it fired.
  const signals = extractSignals(answers)
  if (burn.applied && burn.signal_text) {
    const burnSignal = {
      question_id: "q17_marketing_spend",
      force: "financial" as ForceKey,
      text: burn.signal_text,
    }
    // Prepend so it leads the risk list — it's the most actionable insight.
    signals.risks = [burnSignal, ...signals.risks].slice(0, 3)
  }

  const revenue_lakhs = numericAnswerValue(answers, "q8_revenue_lakhs")
  const headcount = numericAnswerValue(answers, "q12_headcount")
  const founder_age = numericAnswerValue(answers, "q16_founder_age")

  const context: AuditContext = {
    revenue_lakhs,
    headcount,
    founder_age,
    stage_tag: deriveStageTag(revenue_lakhs),
  }

  const focus_reason = buildFocusReason(focus_force, scores[focus_force], signals)

  return {
    scores,
    focus_force,
    focus_force_label: FORCE_LABELS[focus_force],
    focus_reason,
    named_move,
    signals,
    context,
  }
}

export { FORCE_LABELS }
