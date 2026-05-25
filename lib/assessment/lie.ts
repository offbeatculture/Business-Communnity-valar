// Long-form assessment — 9-Lie assignment
// ════════════════════════════════════════════════════════════
// Deterministic Q-tell assignment. Each Lie has a pattern of
// Q-IDs + answer values; we count matches and return the Lie
// with the most fired tells. Ties broken by priority order.
//
// Pure + deterministic. No LLM, no fetch.

import type { ForceScores } from "@/lib/audit/scoring"
import type { AuditAnswer, AuditAnswers } from "@/lib/audit/types"
import { ASSESSMENT_QUESTIONS } from "./questions"

// ─── Keys ───────────────────────────────────────────────────

export const LIE_KEYS = [
  "identity_trap",
  "x_factor_hunt",
  "death_spiral",
  "marketing_lie",
  "sales_lie",
  "conversion_lie",
  "profit_lie",
  "growth_lie",
  "freedom_lie",
] as const

export type LieKey = (typeof LIE_KEYS)[number]

// ─── Profile catalogue ──────────────────────────────────────

export type LieProfile = {
  key: LieKey
  label: string
  bootcamp_day: 1 | 2 | 3
  bootcamp_hour: 1 | 2 | 3
  short_diagnosis: string
  contradiction_template: string
}

export const LIES: Record<LieKey, LieProfile> = {
  identity_trap: {
    key: "identity_trap",
    label: "The Identity Trap",
    bootcamp_day: 1,
    bootcamp_hour: 1,
    short_diagnosis:
      "You've named a product, a job title, or a platitude — not the business you're actually in.",
    contradiction_template:
      "You say you're in the {{stated_business}} business, but your customers buy a feature, a job title, or a receipt — that's not a business, that's a transaction.",
  },
  x_factor_hunt: {
    key: "x_factor_hunt",
    label: "The X-Factor Hunt",
    bootcamp_day: 1,
    bootcamp_hour: 2,
    short_diagnosis:
      "You think competitors are smarter or better-funded; in reality the gap is willingness, not knowledge.",
    contradiction_template:
      "You say your X-Factor is {{stated_xfactor}}, but you can't name a single cost (time, money, comfort) you pay that a competitor refuses to — the moat is imaginary.",
  },
  death_spiral: {
    key: "death_spiral",
    label: "The Death Spiral",
    bootcamp_day: 1,
    bootcamp_hour: 3,
    short_diagnosis:
      "Three or more upstream forces — Identity, X-Factor, Marketing, Sales — are all collapsed. No single fix works.",
    contradiction_template:
      "You're trying to fix one thing at a time, but {{collapsed_forces}} are all below the waterline at once — this is a sequencing problem, not a single-lever problem.",
  },
  marketing_lie: {
    key: "marketing_lie",
    label: "The Marketing Lie",
    bootcamp_day: 2,
    bootcamp_hour: 1,
    short_diagnosis:
      "You believe the answer is more ads, more reels, a better agency. You're spending Layer 3 money on a Layer 1 vacuum.",
    contradiction_template:
      "You say marketing is your problem, but you're {{burn_evidence}} on distribution with no Layer 1 position — you're amplifying silence.",
  },
  sales_lie: {
    key: "sales_lie",
    label: "The Sales Lie",
    bootcamp_day: 2,
    bootcamp_hour: 2,
    short_diagnosis:
      "You believe sales is closing. Closing is the residue of failure at offer and investigation.",
    contradiction_template:
      "You say you need to close better, but {{talk_ratio_evidence}} — the closing problem is an offer and investigation problem in disguise.",
  },
  conversion_lie: {
    key: "conversion_lie",
    label: "The Conversion Lie",
    bootcamp_day: 2,
    bootcamp_hour: 3,
    short_diagnosis:
      "You think the problem is the funnel maths. The leak is trust scaffolding: stock photos, generic superlatives, invisible founder, post-sale ghosting.",
    contradiction_template:
      "You say conversion is the issue, but your {{trust_leak}} is bleeding trust before the offer is even read — fix the scaffolding first.",
  },
  profit_lie: {
    key: "profit_lie",
    label: "The Profit Lie",
    bootcamp_day: 3,
    bootcamp_hour: 1,
    short_diagnosis:
      "You believe you're profitable. You're not — you're underpaid. Plug your replacement wage in and the truth shows up.",
    contradiction_template:
      "You say the business is profitable, but {{salary_evidence}} — that's not profit, that's underpaying yourself to hide the leak.",
  },
  growth_lie: {
    key: "growth_lie",
    label: "The Growth Lie",
    bootcamp_day: 3,
    bootcamp_hour: 2,
    short_diagnosis:
      "You think growth = more leads. 25% improvement applied away from the bottleneck produces zero throughput.",
    contradiction_template:
      "You say you need more {{growth_lever}}, but you haven't named your Herbie — every rupee landing away from the constraint is wasted.",
  },
  freedom_lie: {
    key: "freedom_lie",
    label: "The Freedom Lie",
    bootcamp_day: 3,
    bootcamp_hour: 3,
    short_diagnosis:
      "You want freedom without subtraction. You want a sellable asset without leaving the rainmaker chair.",
    contradiction_template:
      "You say you want freedom, but {{freedom_evidence}} — freedom is the residue of relentless subtraction, not the addition of one more thing.",
  },
}

// ─── Q-tell pattern matching ────────────────────────────────

function choiceValue(answer: AuditAnswer | undefined): string | null {
  if (!answer || !("value" in answer)) return null
  return typeof answer.value === "string" ? answer.value : null
}

function choiceScore(answer: AuditAnswer | undefined): number | null {
  if (!answer || !("score" in answer)) return null
  return typeof answer.score === "number" ? answer.score : null
}

function numericValue(answer: AuditAnswer | undefined): number | null {
  if (!answer || !("value" in answer)) return null
  return typeof answer.value === "number" && Number.isFinite(answer.value)
    ? answer.value
    : null
}

// Look up the label of the chosen option for a given qid+value
function optionLabel(qid: string, value: string | null): string | null {
  if (!value) return null
  const q = ASSESSMENT_QUESTIONS.find((x) => x.id === qid)
  if (!q) return null
  if (q.input_type !== "choice" && q.input_type !== "band") return null
  const opt = q.options.find((o) => o.value === value)
  return opt ? opt.label : null
}

type TellMatch = {
  qid: string
  evidence: string // "Q19: I sell 7-ply stainless steel cookware"
}

// Collect every fired tell across all 9 lies. Each lie's matches
// are independent so a single answer can contribute to multiple lies.
function collectTells(
  scores: ForceScores,
  answers: AuditAnswers,
): Record<LieKey, TellMatch[]> {
  const out: Record<LieKey, TellMatch[]> = {
    identity_trap: [],
    x_factor_hunt: [],
    death_spiral: [],
    marketing_lie: [],
    sales_lie: [],
    conversion_lie: [],
    profit_lie: [],
    growth_lie: [],
    freedom_lie: [],
  }

  const push = (key: LieKey, qid: string) => {
    const a = answers[qid]
    const val = choiceValue(a)
    const label = optionLabel(qid, val) ?? (val ?? "(no answer)")
    out[key].push({
      qid,
      // First underscore separates the Q-id prefix (e.g. "q19") from the
      // slug ("business_naming") — render as "Q19: business naming".
      evidence: `${qid.toUpperCase().replace(/_/, ": ").replace(/_/g, " ")} → ${label}`,
    })
  }

  const valIn = (qid: string, vals: string[]): boolean => {
    const v = choiceValue(answers[qid])
    return v !== null && vals.includes(v)
  }

  // ─── identity_trap ───
  if (valIn("q1_icp_clarity", ["anyone"])) push("identity_trap", "q1_icp_clarity")
  if (
    valIn("q19_business_naming", [
      "job_title",
      "spec_sheet",
      "quality_trust",
      "receipt",
    ])
  ) {
    push("identity_trap", "q19_business_naming")
  }
  if (valIn("q21_best_in_city", ["blank", "vague_slogan"])) {
    push("identity_trap", "q21_best_in_city")
  }
  if (valIn("q24_customer_change_named", ["cannot_fill", "feature"])) {
    push("identity_trap", "q24_customer_change_named")
  }

  // ─── x_factor_hunt ───
  if (valIn("q2_xfactor_source", ["assumed_generic"])) {
    push("x_factor_hunt", "q2_xfactor_source")
  }
  if (valIn("q28_cost_type", ["none_yet", "working_volume"])) {
    push("x_factor_hunt", "q28_cost_type")
  }
  if (valIn("q31_imitable_in_30_days", ["30_days", "overnight"])) {
    push("x_factor_hunt", "q31_imitable_in_30_days")
  }
  if (valIn("q33_referral_sentence", ["cannot_write"])) {
    push("x_factor_hunt", "q33_referral_sentence")
  }

  // ─── marketing_lie ───
  if (valIn("q39_stack_layer_dominant", ["layer3_distribution"])) {
    push("marketing_lie", "q39_stack_layer_dominant")
  }
  if (valIn("q42_pattern_diagnosis", ["layer3_bleeder"])) {
    push("marketing_lie", "q42_pattern_diagnosis")
  }
  // Burn signal: Q41 ≥ 5L AND Q5 high CPL (low score)
  const q41Val = choiceValue(answers["q41_marketing_burn_pattern"])
  const q5Score = choiceScore(answers["q5_cpl"])
  if (
    q41Val !== null &&
    (q41Val === "5L_15L" || q41Val === "gt_15L") &&
    q5Score !== null &&
    q5Score <= 2
  ) {
    push("marketing_lie", "q41_marketing_burn_pattern")
  }

  // ─── sales_lie ───
  if (valIn("q49_investigation_ratio", ["i_talk_70", "i_talk_90"])) {
    push("sales_lie", "q49_investigation_ratio")
  }
  if (valIn("q51_lost_deal_diagnosis", ["prospect_fault", "havent_thought"])) {
    push("sales_lie", "q51_lost_deal_diagnosis")
  }
  if (valIn("q47_xyz_guarantee", ["no_guarantee"])) {
    push("sales_lie", "q47_xyz_guarantee")
  }

  // ─── conversion_lie ───
  if (valIn("q52_continuation_count", ["mostly_continuation"])) {
    push("conversion_lie", "q52_continuation_count")
  }
  if (
    valIn("q53_trust_leak", [
      "stock_photo",
      "generic_superlative",
      "do_everything",
      "invisible_founder",
      "post_sale_ghost",
    ])
  ) {
    push("conversion_lie", "q53_trust_leak")
  }

  // ─── profit_lie ───
  if (valIn("q57_corrected_pretax", ["0_5", "negative", "dont_know"])) {
    push("profit_lie", "q57_corrected_pretax")
  }
  if (valIn("q59_profit_allocation", ["zero", "zero_intend"])) {
    push("profit_lie", "q59_profit_allocation")
  }
  // Q55 < 0.4 × Q56 → underpaid
  const q55 = numericValue(answers["q55_owner_salary"])
  const q56 = numericValue(answers["q56_bus_test_wage"])
  if (q55 !== null && q56 !== null && q56 > 0 && q55 < 0.4 * q56) {
    push("profit_lie", "q55_owner_salary")
  }
  if (valIn("q62_avoidance_pattern", ["over_year", "never_real_one"])) {
    push("profit_lie", "q62_avoidance_pattern")
  }

  // ─── growth_lie ───
  if (
    valIn("q64_herbie_named", ["owner_me", "generic_team_cash", "dont_know"])
  ) {
    push("growth_lie", "q64_herbie_named")
  }
  if (valIn("q67_three_ways_pattern", ["way_1_only", "none_systematic"])) {
    push("growth_lie", "q67_three_ways_pattern")
  }
  if (valIn("q65_effort_location", ["lt_25"])) {
    push("growth_lie", "q65_effort_location")
  }

  // ─── freedom_lie ───
  if (valIn("q73_vacation_test", ["lt_3", "7_14"])) {
    push("freedom_lie", "q73_vacation_test")
  }
  if (valIn("q74_only_i_can", ["several", "most_things"])) {
    push("freedom_lie", "q74_only_i_can")
  }
  if (valIn("q84_last_subtraction", ["cannot_remember"])) {
    push("freedom_lie", "q84_last_subtraction")
  }
  if (valIn("q89_freedom_subtraction_admission", ["dont_want_to", "cant_afford"])) {
    push("freedom_lie", "q89_freedom_subtraction_admission")
  }

  // ─── death_spiral (cumulative) ───
  // Fires when 3+ of {identity, x_factor, marketing, sales} are below 2.
  const upstreamCollapsed: string[] = []
  if (scores.identity.score < 2) upstreamCollapsed.push("identity")
  if (scores.x_factor.score < 2) upstreamCollapsed.push("x_factor")
  if (scores.marketing.score < 2) upstreamCollapsed.push("marketing")
  if (scores.sales.score < 2) upstreamCollapsed.push("sales")
  if (upstreamCollapsed.length >= 3) {
    // Synthetic evidence: each collapsed force becomes a "tell"
    for (const force of upstreamCollapsed) {
      out.death_spiral.push({
        qid: `force:${force}`,
        evidence: `${force} force at ${scores[force as keyof ForceScores].score.toFixed(1)}/5 — below the waterline.`,
      })
    }
  }

  return out
}

// ─── Contradiction templating ───────────────────────────────

function fillContradiction(
  lie: LieKey,
  scores: ForceScores,
  answers: AuditAnswers,
): string {
  const template = LIES[lie].contradiction_template

  const substitute = (key: string, value: string): string => {
    return template.includes(`{{${key}}}`)
      ? template.replace(`{{${key}}}`, value)
      : template
  }

  switch (lie) {
    case "identity_trap": {
      const label =
        optionLabel("q19_business_naming", choiceValue(answers["q19_business_naming"])) ??
        "what you sell"
      return substitute("stated_business", label.toLowerCase())
    }
    case "x_factor_hunt": {
      const label =
        optionLabel("q2_xfactor_source", choiceValue(answers["q2_xfactor_source"])) ??
        "what makes you different"
      return substitute("stated_xfactor", label.toLowerCase())
    }
    case "death_spiral": {
      const collapsed: string[] = []
      if (scores.identity.score < 2) collapsed.push("Identity")
      if (scores.x_factor.score < 2) collapsed.push("X-Factor")
      if (scores.marketing.score < 2) collapsed.push("Marketing")
      if (scores.sales.score < 2) collapsed.push("Sales")
      return substitute(
        "collapsed_forces",
        collapsed.join(", ") || "your upstream forces",
      )
    }
    case "marketing_lie": {
      const burn =
        optionLabel(
          "q41_marketing_burn_pattern",
          choiceValue(answers["q41_marketing_burn_pattern"]),
        ) ?? "spending heavily"
      return substitute("burn_evidence", burn.toLowerCase())
    }
    case "sales_lie": {
      const ratio =
        optionLabel(
          "q49_investigation_ratio",
          choiceValue(answers["q49_investigation_ratio"]),
        ) ?? "you do most of the talking"
      return substitute("talk_ratio_evidence", ratio.toLowerCase())
    }
    case "conversion_lie": {
      const leak =
        optionLabel("q53_trust_leak", choiceValue(answers["q53_trust_leak"])) ??
        "trust scaffolding"
      return substitute("trust_leak", leak.toLowerCase())
    }
    case "profit_lie": {
      const q55 = numericValue(answers["q55_owner_salary"])
      const q56 = numericValue(answers["q56_bus_test_wage"])
      let evidence = "your numbers don't add up"
      if (q55 !== null && q56 !== null && q56 > 0) {
        evidence = `you're paying yourself ₹${q55.toLocaleString("en-IN")}/mo against a replacement cost of ₹${q56.toLocaleString("en-IN")}/mo`
      } else {
        const profitAlloc = optionLabel(
          "q59_profit_allocation",
          choiceValue(answers["q59_profit_allocation"]),
        )
        if (profitAlloc) evidence = `your profit allocation is "${profitAlloc.toLowerCase()}"`
      }
      return substitute("salary_evidence", evidence)
    }
    case "growth_lie": {
      const herbie =
        optionLabel("q64_herbie_named", choiceValue(answers["q64_herbie_named"])) ??
        "leads"
      return substitute("growth_lever", herbie.toLowerCase())
    }
    case "freedom_lie": {
      const evidence =
        optionLabel(
          "q89_freedom_subtraction_admission",
          choiceValue(answers["q89_freedom_subtraction_admission"]),
        ) ??
        optionLabel("q74_only_i_can", choiceValue(answers["q74_only_i_can"])) ??
        "you keep adding instead of subtracting"
      return substitute("freedom_evidence", evidence.toLowerCase())
    }
  }
}

// ─── Assignment ─────────────────────────────────────────────

export type LieAssignment = {
  primary: LieKey
  evidence: string[]
  contradiction: string
  confidence: "high" | "medium" | "low"
}

/**
 * Deterministic Lie assignment from Q-tell pattern matching.
 * Highest tell-count wins; ties broken by LIE_KEYS priority order.
 */
export function assignLie(
  scores: ForceScores,
  answers: AuditAnswers,
): LieAssignment {
  const tells = collectTells(scores, answers)

  // Find highest-scoring lie, ties broken by LIE_KEYS order
  let bestKey: LieKey = "identity_trap"
  let bestCount = -1
  for (const key of LIE_KEYS) {
    const count = tells[key].length
    if (count > bestCount) {
      bestCount = count
      bestKey = key
    }
  }

  const matched = tells[bestKey]
  const evidence = matched.slice(0, 3).map((m) => m.evidence)

  let confidence: "high" | "medium" | "low"
  if (bestCount >= 3) confidence = "high"
  else if (bestCount === 2) confidence = "medium"
  else confidence = "low"

  const contradiction = fillContradiction(bestKey, scores, answers)

  return {
    primary: bestKey,
    evidence,
    contradiction,
    confidence,
  }
}
