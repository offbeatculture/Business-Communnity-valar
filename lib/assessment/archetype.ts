// Long-form assessment — 7-archetype assignment
// ════════════════════════════════════════════════════════════
// Deterministic 3-input pipeline:
//   1. Stage band (revenue + headcount) → candidate set
//   2. Force fingerprint match → score within candidate set
//   3. Q-specific tells → tie-break
//
// Pure + deterministic. No LLM, no fetch.
// Source of truth: long-form-assessment-archetypes-v1.md

import type { ForceScores } from "@/lib/audit/scoring"
import type { AuditAnswer, AuditAnswers, ForceKey } from "@/lib/audit/types"

// ─── Keys ───────────────────────────────────────────────────

export const ARCHETYPE_KEYS = [
  "grinder",
  "inheritor",
  "migrator",
  "name",
  "rainmakers_firm",
  "institution",
  "architect",
] as const

export type ArchetypeKey = (typeof ARCHETYPE_KEYS)[number]

// ─── Profile catalogue ──────────────────────────────────────

export type ArchetypeProfile = {
  key: ArchetypeKey
  label: string
  one_liner: string
  bootcamp_lie: string
  bootcamp_rx_day: 1 | 2 | 3
  bootcamp_rx_hour: 1 | 2 | 3
  strong_forces: ForceKey[]
  weak_forces: ForceKey[]
  scale_code_stage: string
}

export const ARCHETYPES: Record<ArchetypeKey, ArchetypeProfile> = {
  grinder: {
    key: "grinder",
    label: "The Grinder",
    one_liner:
      "The founder whose calendar IS the business — if they stop dialling, the lights go out by Friday.",
    bootcamp_lie: "The Identity Trap",
    bootcamp_rx_day: 1,
    bootcamp_rx_hour: 1,
    strong_forces: ["sales"],
    weak_forces: ["identity", "x_factor", "financial", "owner_energy"],
    scale_code_stage: "GRIP",
  },
  inheritor: {
    key: "inheritor",
    label: "The Inheritor",
    one_liner:
      "The second-generation founder running a business they were handed — with legacy customers, legacy SOPs, and a legacy identity that no longer fits.",
    bootcamp_lie: "The X-Factor Hunt",
    bootcamp_rx_day: 1,
    bootcamp_rx_hour: 1,
    strong_forces: ["financial", "optimisation"],
    weak_forces: ["identity", "x_factor", "marketing"],
    scale_code_stage: "STRIDE",
  },
  migrator: {
    key: "migrator",
    label: "The Migrator",
    one_liner:
      "The offline-native founder mid-shift to digital — running two businesses at once, neither well.",
    bootcamp_lie: "The Marketing Lie",
    bootcamp_rx_day: 2,
    bootcamp_rx_hour: 1,
    strong_forces: ["sales", "identity"],
    weak_forces: ["marketing", "optimisation", "owner_energy"],
    scale_code_stage: "STRIDE",
  },
  name: {
    key: "name",
    label: "The Name",
    one_liner:
      "The founder who IS the brand — the business runs on their face, their voice, their personal trust.",
    bootcamp_lie: "The Freedom Lie",
    bootcamp_rx_day: 3,
    bootcamp_rx_hour: 3,
    strong_forces: ["identity", "x_factor", "marketing"],
    weak_forces: ["scale", "optimisation", "owner_energy"],
    scale_code_stage: "THRESHOLD",
  },
  rainmakers_firm: {
    key: "rainmakers_firm",
    label: "The Rainmaker's Firm",
    one_liner:
      "The agency / services firm where the team delivers, but the founder is still the only salesperson.",
    bootcamp_lie: "The Sales Lie",
    bootcamp_rx_day: 2,
    bootcamp_rx_hour: 2,
    strong_forces: ["optimisation", "financial"],
    weak_forces: ["x_factor", "scale", "sales"],
    scale_code_stage: "SURGE",
  },
  institution: {
    key: "institution",
    label: "The Institution",
    one_liner:
      "The founder who has actually built the asset — runs without them for 30+ days, sellable on paper, optionality real.",
    bootcamp_lie: "The Growth Lie",
    bootcamp_rx_day: 3,
    bootcamp_rx_hour: 2,
    strong_forces: ["scale", "optimisation", "x_factor", "financial"],
    weak_forces: ["owner_energy", "marketing"],
    scale_code_stage: "COMMAND",
  },
  architect: {
    key: "architect",
    label: "The Architect",
    one_liner:
      "The founder who has rebuilt themselves as a governance layer — the business is an institution with an owner, not the other way round.",
    bootcamp_lie: "The Identity Trap (late-stage)",
    bootcamp_rx_day: 1,
    bootcamp_rx_hour: 1,
    strong_forces: ["scale", "optimisation", "financial", "owner_energy"],
    weak_forces: ["identity"],
    scale_code_stage: "LEGACY",
  },
}

// ─── Stage detection ────────────────────────────────────────

type StageBand = "SPARK_GRIP" | "STRIDE" | "THRESHOLD" | "SURGE" | "COMMAND" | "LEGACY"

const STAGE_CANDIDATES: Record<StageBand, ArchetypeKey[]> = {
  SPARK_GRIP: ["grinder", "inheritor"],
  STRIDE: ["migrator", "name", "inheritor"],
  // Migrator can also live at THRESHOLD — the offline→digital founder
  // who's spent enough to grow revenue but whose Layer-1 positioning is
  // still broken. Their force fingerprint (low marketing + low identity
  // + cash burn signal) disambiguates them from Name/Rainmaker's Firm.
  THRESHOLD: ["name", "rainmakers_firm", "migrator"],
  SURGE: ["rainmakers_firm", "name"],
  COMMAND: ["institution"],
  LEGACY: ["architect", "institution"],
}

function numericAnswer(answers: AuditAnswers, qid: string): number | null {
  const a = answers[qid]
  if (!a || !("value" in a)) return null
  return typeof a.value === "number" && Number.isFinite(a.value) ? a.value : null
}

function choiceValue(answer: AuditAnswer | undefined): string | null {
  if (!answer || !("value" in answer)) return null
  return typeof answer.value === "string" ? answer.value : null
}

function choiceScore(answer: AuditAnswer | undefined): number | null {
  if (!answer || !("score" in answer)) return null
  return typeof answer.score === "number" ? answer.score : null
}

// Revenue in lakhs (Q8). Headcount (Q12). Both with sensible
// fallbacks: missing revenue → start at GRIP; missing headcount → 0.
function detectStage(answers: AuditAnswers): StageBand {
  const revenueLakhs = numericAnswer(answers, "q8_revenue_lakhs") ?? 0
  const headcount = numericAnswer(answers, "q12_headcount") ?? 0

  // LEGACY: revenue ≥ ₹10 Cr (1000 L)
  if (revenueLakhs >= 1000) return "LEGACY"
  // COMMAND: ₹3–₹10 Cr (300–999 L)
  if (revenueLakhs >= 300) return "COMMAND"
  // SURGE: ₹1–₹3 Cr (100–299 L)
  if (revenueLakhs >= 100) return "SURGE"
  // THRESHOLD: ₹50L–₹1Cr (50–99 L)
  if (revenueLakhs >= 50) return "THRESHOLD"
  // STRIDE: ₹20L–₹50L (20–49 L)
  if (revenueLakhs >= 20) return "STRIDE"
  // SPARK/GRIP: < ₹20L
  // Headcount ≥ 8 with very low revenue is unusual — let force fingerprint sort it.
  if (headcount >= 8 && revenueLakhs >= 10) return "STRIDE"
  return "SPARK_GRIP"
}

// ─── Force fingerprint match ────────────────────────────────

// Within each candidate set, score each archetype by counting
// strong-force matches (score ≥ 3.5) + weak-force matches (score
// ≤ 2.5), divided by total fingerprint forces.
function fingerprintMatch(
  archetype: ArchetypeKey,
  scores: ForceScores,
): number {
  const profile = ARCHETYPES[archetype]
  const fingerprint = [...profile.strong_forces, ...profile.weak_forces]
  if (fingerprint.length === 0) return 0
  let hits = 0
  for (const force of profile.strong_forces) {
    if (scores[force].score >= 3.5) hits += 1
  }
  for (const force of profile.weak_forces) {
    if (scores[force].score <= 2.5) hits += 1
  }
  return hits / fingerprint.length
}

// ─── Q-tell tie-breakers ────────────────────────────────────
// Each tell adds a small boost (0.05) to the matching archetype's
// score so fingerprint stays dominant but ties get resolved.

function qTellBoosts(
  scores: ForceScores,
  answers: AuditAnswers,
): Partial<Record<ArchetypeKey, number>> {
  const boosts: Partial<Record<ArchetypeKey, number>> = {}
  const bump = (k: ArchetypeKey, n = 0.05) => {
    boosts[k] = (boosts[k] ?? 0) + n
  }

  const ownerHours = numericAnswer(answers, "q11_owner_hours")
  const headcount = numericAnswer(answers, "q12_headcount") ?? 0
  const q3 = numericAnswer(answers, "q3_top3_concentration")
  const q1 = choiceValue(answers["q1_icp_clarity"])
  const q19 = choiceValue(answers["q19_business_naming"])
  const q20 = choiceValue(answers["q20_disappearance_days"])
  const q73 = choiceValue(answers["q73_vacation_test"])
  const q78 = choiceValue(answers["q78_founder_as_asset_risk"])
  const q26 = choiceValue(answers["q26_kodak_check"])
  const q27 = choiceValue(answers["q27_inherited_definition"])
  const q44 = choiceValue(answers["q44_wom_diagnosis"])
  const q41 = choiceValue(answers["q41_marketing_burn_pattern"])
  const q39 = choiceValue(answers["q39_stack_layer_dominant"])
  const q5 = choiceScore(answers["q5_cpl"])
  const q17 = choiceValue(answers["q17_marketing_spend"])
  const q80 = choiceValue(answers["q80_sellable_in_90_days"])
  const q25 = choiceScore(answers["q25_self_rated_identity_clarity"])

  // GRINDER: owner hours ≥ 60, Q19 = job_title, lives on hustle
  if (ownerHours !== null && ownerHours >= 60) bump("grinder")
  if (q19 === "job_title") bump("grinder", 0.08)
  if (q1 === "anyone") bump("grinder")
  if (q20 === "lt_3" || q20 === "3_7") bump("grinder")
  // Grinder doesn't spend on marketing (vs Migrator)
  if (q17 === "lt_5" && scores.marketing.score <= 2) bump("grinder")

  // INHERITOR: legacy WoM, inherited definition, low marketing spend
  if (q44 === "untested" || q44 === "general_referral") bump("inheritor")
  if (q27 === "inherited" || q27 === "default") bump("inheritor", 0.08)
  if (q26 === "no_threat" || q26 === "noticed_dismissed") bump("inheritor")
  // Healthier financial vs peers
  if (scores.financial.score >= 3.5 && scores.marketing.score <= 2) bump("inheritor")

  // MIGRATOR: spending on marketing AND it's not working
  if (q39 === "layer3_distribution") bump("migrator", 0.08)
  if (q41 === "5L_15L" || q41 === "gt_15L") bump("migrator", 0.08)
  if (q17 === "15_30" || q17 === "30_50" || q17 === "gt_50") {
    if (scores.marketing.score <= 3) bump("migrator")
  }
  // Migrator: high CPL signal
  if (q5 !== null && q5 <= 2 && scores.marketing.score <= 3) bump("migrator")

  // NAME: founder IS the brand
  if (q78 === "mostly_my_name" || q78 === "only_my_name") bump("name", 0.08)
  if (q3 !== null && q3 >= 50 && headcount <= 5) bump("name")
  if ((q20 === "lt_3" || q20 === "3_7") && scores.x_factor.score >= 3.5) bump("name")
  if (scores.identity.score >= 4 && scores.x_factor.score >= 4 && headcount <= 5) {
    bump("name")
  }

  // RAINMAKER'S FIRM: 8+ headcount but founder still closes
  if (headcount >= 8) bump("rainmakers_firm", 0.05)
  if (headcount >= 8 && scores.sales.score <= 3.5 && scores.x_factor.score <= 3) {
    bump("rainmakers_firm", 0.08)
  }
  if (q78 === "mostly_firm" || q78 === "firm_brand_process") {
    if (headcount >= 8) bump("rainmakers_firm")
  }

  // INSTITUTION: survives without founder, 15+ headcount
  if (q20 === "gt_90" || q20 === "30_90") bump("institution")
  if (q73 === "60_plus" || q73 === "30") bump("institution")
  if (headcount >= 15) bump("institution")
  if (q80 === "yes_running" || q80 === "yes_after_handover") bump("institution")

  // ARCHITECT: < 30 hr weeks AND high scale + governance signals
  if (ownerHours !== null && ownerHours < 30 && scores.scale.score >= 4) {
    bump("architect", 0.1)
  }
  if (q73 === "60_plus" && scores.scale.score >= 4.5) bump("architect")
  // Architect tell: slightly aged identity (Q25 self-rated lower than peers)
  if (q25 !== null && q25 <= 3 && scores.scale.score >= 4.5) bump("architect")

  return boosts
}

// ─── Assignment ─────────────────────────────────────────────

export type ArchetypeAssignment = {
  primary: ArchetypeKey
  secondary: ArchetypeKey | null
  reasoning: string[]
}

/**
 * Deterministic 3-input pipeline. Never returns null — falls back
 * to "grinder" with a low-confidence note if signal is too weak.
 */
export function assignArchetype(
  scores: ForceScores,
  answers: AuditAnswers,
): ArchetypeAssignment {
  const stage = detectStage(answers)
  const candidates = STAGE_CANDIDATES[stage]
  const boosts = qTellBoosts(scores, answers)

  // Score each candidate
  const scored = candidates.map((key) => {
    const fp = fingerprintMatch(key, scores)
    const boost = boosts[key] ?? 0
    return { key, fp, boost, total: fp + boost }
  })

  // Sort by total desc, tie-broken by candidate order (already in design priority)
  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return candidates.indexOf(a.key) - candidates.indexOf(b.key)
  })

  const top = scored[0]
  const second = scored[1] ?? null

  // Low-confidence fallback if even the top score is essentially zero
  const lowConfidence = top.total < 0.15

  const primary: ArchetypeKey = lowConfidence ? "grinder" : top.key
  const secondary: ArchetypeKey | null = lowConfidence
    ? null
    : second && second.total >= 0.1
      ? second.key
      : null

  // ─── Build reasoning bullets ──────────────────────────────
  const reasoning: string[] = []
  const profile = ARCHETYPES[primary]

  reasoning.push(
    `Stage band: ${stage.replace("_", "/")} (revenue ${numericAnswer(answers, "q8_revenue_lakhs") ?? "?"} L, headcount ${numericAnswer(answers, "q12_headcount") ?? "?"}) — candidates: ${candidates.map((k) => ARCHETYPES[k].label).join(", ")}.`,
  )

  // Force fingerprint summary
  const strongHits = profile.strong_forces
    .filter((f) => scores[f].score >= 3.5)
    .map((f) => `${f} ${scores[f].score.toFixed(1)}`)
  const weakHits = profile.weak_forces
    .filter((f) => scores[f].score <= 2.5)
    .map((f) => `${f} ${scores[f].score.toFixed(1)}`)
  if (strongHits.length > 0 || weakHits.length > 0) {
    const parts: string[] = []
    if (strongHits.length > 0) parts.push(`strong on ${strongHits.join(", ")}`)
    if (weakHits.length > 0) parts.push(`weak on ${weakHits.join(", ")}`)
    reasoning.push(
      `Force fingerprint matches ${profile.label}: ${parts.join("; ")}.`,
    )
  } else {
    reasoning.push(
      `Force fingerprint for ${profile.label} did not strongly match — relying on stage band + Q-tells.`,
    )
  }

  // Q-tell highlights for the chosen archetype
  const primaryBoost = boosts[primary] ?? 0
  if (primaryBoost > 0) {
    reasoning.push(
      `Q-tell evidence reinforced ${profile.label} (boost ${primaryBoost.toFixed(2)}).`,
    )
  }

  if (secondary) {
    reasoning.push(
      `Secondary archetype: ${ARCHETYPES[secondary].label} — the archetype you flirt with.`,
    )
  }

  if (lowConfidence) {
    reasoning.push(
      "Low-confidence assignment: signal across stage + forces was weak; defaulting to The Grinder as the safest early-stage prescription.",
    )
  }

  return { primary, secondary, reasoning }
}
