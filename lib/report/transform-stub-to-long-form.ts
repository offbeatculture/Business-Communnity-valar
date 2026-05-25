// ════════════════════════════════════════════════════════════
// Transformer: StubReportPayload → LongFormReportPayload
// ════════════════════════════════════════════════════════════
//
// Phase 4 spike bridge. The existing Phase 2 stub generator
// produces a minimal `StubReportPayload`. The new long-form
// renderer wants a `LongFormReportPayload`. This transformer:
//
//   - Maps the stub's archetype/lie/scores/named_move forward
//   - Looks up rich archetype + Lie metadata from
//     lib/assessment/{archetype,lie}.ts
//   - Templates placeholder prose for fields the stub doesn't
//     compute (full archetype description, Lie evidence prose,
//     cost paragraph, etc.) — these get filled by the Mac
//     daemon + Claude in Phase 3.
//
// Pure function. No I/O. Safe to call with empty answers.

import "server-only"
import { plusDays, formatLongDate } from "./pdf/utils"
import type { LongFormReportPayload } from "./long-form-types"
import type { StubReportPayload } from "@/types/assessment"
import { ARCHETYPES, type ArchetypeKey } from "@/lib/assessment/archetype"
import { LIES, type LieKey } from "@/lib/assessment/lie"
import { FORCE_KEYS, VERTICALS, type ForceKey } from "@/lib/audit/types"

const PHASE_4_WATERMARK = "PHASE 4 SPIKE — LAYOUT REVIEW ONLY"

// Reverse-lookup helpers — stub stores display name, we need the key
// to fetch the full profile.
function archetypeKeyFromName(name: string): ArchetypeKey {
  for (const [k, v] of Object.entries(ARCHETYPES)) {
    if (v.label === name) return k as ArchetypeKey
  }
  return "grinder"
}

function lieKeyFromName(name: string): LieKey {
  for (const [k, v] of Object.entries(LIES)) {
    if (v.label === name) return k as LieKey
  }
  return "identity_trap"
}

const ARCHETYPE_KEY_FOR_GRID: ArchetypeKey[] = [
  "grinder",
  "inheritor",
  "migrator",
  "name",
  "rainmakers_firm",
  "institution",
  "architect",
]

// 2-axis grid coordinates per archetype:
// x = demand source (0 = founder chasing, 1 = systemic)
// y = founder dependence (0 = high, 1 = low)
const ARCHETYPE_GRID_POS: Record<ArchetypeKey, { x: number; y: number }> = {
  grinder: { x: 0.15, y: 0.15 },
  inheritor: { x: 0.35, y: 0.45 },
  migrator: { x: 0.4, y: 0.25 },
  name: { x: 0.25, y: 0.3 },
  rainmakers_firm: { x: 0.6, y: 0.6 },
  institution: { x: 0.75, y: 0.8 },
  architect: { x: 0.9, y: 0.95 },
}

export type LongFormTransformInput = {
  stub: StubReportPayload
  // Fields not in the stub but on the submission row.
  city: string | null
  // The full submission for appendix + waterfall data.
  answers: Record<string, unknown>
  // For the cash mirror waterfall, parse from answers if present.
  // Phase 3 will compute these properly.
}

export function transformStubToLongForm(
  input: LongFormTransformInput,
): LongFormReportPayload {
  const { stub } = input
  const firstName = stub.founder.full_name.trim().split(/\s+/)[0] || "Founder"
  const archetypeKey = archetypeKeyFromName(stub.archetype.name)
  const archetypeProfile = ARCHETYPES[archetypeKey]
  const lieKey = lieKeyFromName(stub.lie.name)
  const lieProfile = LIES[lieKey]

  // Resolve vertical label from VERTICALS table.
  const verticalEntry = VERTICALS.find((v) => v.value === stub.founder.vertical)
  const verticalLabel = verticalEntry?.label ?? stub.founder.vertical_label

  // Stage band derived from archetype's scale_code_stage hint.
  const stageBandLabel = mapStageToBandLabel(archetypeProfile.scale_code_stage)

  // Numerical scoring helpers.
  const scoresByForce = coerceForceScores(stub.scores)
  const verticalMedians = mockVerticalMedians() // Phase 3: real benchmark engine

  const generatedAt = new Date(stub.generated_at)
  const rereadDate = plusDays(generatedAt, 90)

  return {
    version: "long-form-v1",
    meta: {
      founder: {
        full_name: stub.founder.full_name,
        first_name: firstName,
        business_name: stub.founder.business_name,
        city: input.city,
        email: "", // not used in PDF body
      },
      vertical: stub.founder.vertical,
      vertical_label: verticalLabel,
      stage_band: archetypeProfile.scale_code_stage,
      generated_at: stub.generated_at,
      watermark: PHASE_4_WATERMARK,
    },

    // ─── §1 Snapshot ─────────────────────────────────────────
    section_01_snapshot: {
      audit_date_label: formatLongDate(generatedAt),
      stage_band_label: stageBandLabel,
      scores: scoresByForce,
      stage_target_line: 3.5, // Phase 3: real per-stage target
      named_move_callout: {
        title: stub.named_move.title,
        one_liner: stub.named_move.promise,
      },
      the_leak_callout: {
        label: "The Leak",
        one_number: stub.named_move.target_metric,
        sub: "Your one number to move next quarter.",
      },
      the_lie_callout: {
        name: stub.lie.name,
        one_liner: stub.lie.contradiction,
      },
    },

    // ─── §2 90-Sec Verdict ───────────────────────────────────
    section_02_verdict: {
      headline_sentence: synthHeadlineSentence(stub, scoresByForce, archetypeProfile),
      strongest_paragraph: synthStrongestPara(scoresByForce, firstName),
      weakest_paragraph: synthWeakestPara(scoresByForce, firstName),
      single_move_paragraph: `${stub.named_move.promise} The Named Move below — ${stub.named_move.title} — is built around moving ${stub.named_move.target_metric}.`,
      if_you_do_nothing_else: stub.named_move.title,
    },

    // ─── §3 Archetype ────────────────────────────────────────
    section_03_archetype: {
      archetype_key: archetypeKey,
      archetype_display_name: archetypeProfile.label,
      description_paragraph: archetypeProfile.one_liner,
      favourite_move: defaultFavouriteMove(archetypeKey),
      why_we_placed_you_here: [
        {
          q_id: "q19_business_naming",
          founder_said: extractAnswerLabel(input.answers, "q19_business_naming"),
          why_it_matters:
            "This is the archetype's tell — how you name the business outs how you see your role in it.",
        },
        {
          q_id: "q20_disappearance_days",
          founder_said: extractAnswerLabel(input.answers, "q20_disappearance_days"),
          why_it_matters:
            "The Disappearance Test is the cleanest single signal of founder-dependence.",
        },
        {
          q_id: "q73_vacation_test",
          founder_said: extractAnswerLabel(input.answers, "q73_vacation_test"),
          why_it_matters:
            "The Vacation Test — paired with the Disappearance answer — locks the archetype.",
        },
      ],
      flirts_with: [
        {
          archetype_key: "rainmakers_firm",
          display_name: ARCHETYPES.rainmakers_firm.label,
          ack_paragraph: ARCHETYPES.rainmakers_firm.one_liner,
        },
        {
          archetype_key: "name",
          display_name: ARCHETYPES.name.label,
          ack_paragraph: ARCHETYPES.name.one_liner,
        },
      ],
      grid_position: ARCHETYPE_GRID_POS[archetypeKey] ?? { x: 0.5, y: 0.5 },
    },

    // ─── §4 The Lie You Hold ─────────────────────────────────
    section_04_lie: {
      lie_key: lieKey,
      lie_display_name: lieProfile.label,
      evidence: stub.lie.why_we_think_you_hold_this.slice(0, 3).map((line, idx) => ({
        q_id: extractQIdFromEvidenceLine(line) ?? `q${idx + 19}_evidence`,
        founder_said: stripQIdPrefix(line),
        inference: `Pattern: ${line.split(":")[0]?.trim() ?? "noted"}.`,
      })),
      cost_paragraph: synthLieCostPara(lieProfile, firstName),
      contradiction: synthContradiction(stub.lie.contradiction),
    },

    // ─── §5-§15 + appendices: templated placeholders ─────────
    // These sections render via the placeholder template until Phase 3
    // hooks up Claude to fill them.
    section_05_stage: stubStage(stageBandLabel, archetypeProfile.scale_code_stage),
    section_06_scorecard: stubScorecard(scoresByForce, verticalMedians),
    section_07_named_move: stubNamedMove(stub),
    section_08_benchmarks: stubBenchmarks(),
    section_09_cash_mirror: stubCashMirror(),
    section_10_hidden_force: stubHiddenForce(),
    section_11_decisions: stubDecisions(),
    section_12_bootcamp_map: stubBootcampMap(archetypeProfile.bootcamp_rx_day),
    section_13_reread_bookmark: {
      reread_date: formatLongDate(rereadDate),
      numbers_to_move: [],
    },
    section_14_two_ways: stubTwoWays(),
    section_15_didnt_cover: { blind_spots: [] },
    appendix_a_answers: { rows: [] },
    appendix_b_glossary: {
      terms: [],
      methodology_note: "",
      engine_version: "v1 (Phase 4 spike)",
    },
  }
}

// ─── Synthesis helpers ───────────────────────────────────────

function synthHeadlineSentence(
  stub: StubReportPayload,
  scores: Record<ForceKey, number>,
  arch: { label: string },
): string {
  const weakest = findExtreme(scores, "min")
  const weakestLabel = forceLabel(weakest.force)
  return `You're a ${arch.label} running at ${weakest.score.toFixed(1)} of 5 on ${weakestLabel} — and that single number is the brake on everything else.`
}

function synthStrongestPara(
  scores: Record<ForceKey, number>,
  firstName: string,
): string {
  const top = findExtreme(scores, "max")
  return `${firstName}, your strongest force is ${forceLabel(top.force)} at ${top.score.toFixed(1)}/5. Whatever you've built here is real and worth defending — full prose on what specifically lands in Phase 3 of the engine.`
}

function synthWeakestPara(
  scores: Record<ForceKey, number>,
  firstName: string,
): string {
  const bottom = findExtreme(scores, "min")
  return `Your weakest force is ${forceLabel(bottom.force)} at ${bottom.score.toFixed(1)}/5. The full evidence trail (which specific answer drove this score, and what it implies) is filled by Claude in Phase 3.`
}

function synthLieCostPara(
  lie: { label: string },
  firstName: string,
): string {
  return `${firstName}, ${lie.label.toLowerCase()} costs you the cleanest things to measure — pipeline that doesn't fill, deals that close at a discount, hours you spent firefighting. Phase 3 of the engine will fill the rupee/hour/customer-count specifics from your own data.`
}

function synthContradiction(rawContradiction: string): {
  you_say: string
  your_numbers_say: string
} {
  const parts = rawContradiction.split(",")
  if (parts.length >= 2) {
    return {
      you_say: parts[0].replace(/^You say:?\s*/i, "").trim(),
      your_numbers_say: parts.slice(1).join(",").replace(/^.*?say:?\s*/i, "").trim(),
    }
  }
  return {
    you_say: "The full answer is in your form.",
    your_numbers_say: rawContradiction,
  }
}

function defaultFavouriteMove(key: ArchetypeKey): string {
  const moves: Record<ArchetypeKey, string> = {
    grinder: "Pick up the phone and dial harder.",
    inheritor: "Optimise the existing operation one more time.",
    migrator: "Run a new ad campaign on the new channel.",
    name: "Take another big speaking gig to generate inbound.",
    rainmakers_firm: "Hire another associate to take work off your plate.",
    institution: "Add another product line or vertical.",
    architect: "Refine the systems further before delegating.",
  }
  return moves[key]
}

function extractAnswerLabel(
  answers: Record<string, unknown>,
  qId: string,
): string {
  const a = answers[qId] as { label?: string; value?: unknown } | undefined
  if (a && typeof a.label === "string" && a.label.length > 0) return a.label
  if (a && typeof a.value !== "undefined") return String(a.value)
  return "[not answered]"
}

function extractQIdFromEvidenceLine(line: string): string | null {
  const m = line.match(/^(Q\d+|q\d+_\w+)/i)
  return m ? m[1].toLowerCase() : null
}

function stripQIdPrefix(line: string): string {
  return line.replace(/^Q\d+:?\s*|^q\d+_\w+:?\s*/i, "").trim()
}

function findExtreme(
  scores: Record<ForceKey, number>,
  mode: "min" | "max",
): { force: ForceKey; score: number } {
  let best: ForceKey = FORCE_KEYS[0]
  let bestScore = scores[best] ?? 0
  for (const f of FORCE_KEYS) {
    const s = scores[f] ?? 0
    if (mode === "max" ? s > bestScore : s < bestScore) {
      best = f
      bestScore = s
    }
  }
  return { force: best, score: bestScore }
}

function coerceForceScores(raw: Record<string, number>): Record<ForceKey, number> {
  const out = {} as Record<ForceKey, number>
  for (const force of FORCE_KEYS) {
    const v = raw[force]
    out[force] = typeof v === "number" && Number.isFinite(v) ? v : 0
  }
  return out
}

function forceLabel(key: ForceKey): string {
  const map: Record<ForceKey, string> = {
    identity: "Identity",
    x_factor: "X-Factor",
    marketing: "Marketing",
    sales: "Sales",
    financial: "Financial",
    optimisation: "Optimisation",
    scale: "Scale",
    owner_energy: "Owner Energy",
  }
  return map[key]
}

function mapStageToBandLabel(stage: string): string {
  const map: Record<string, string> = {
    SPARK: "SPARK — under ₹2L/month",
    GRIP: "GRIP — ₹2L to ₹20L/month",
    STRIDE: "STRIDE — ₹20L to ₹50L/month",
    THRESHOLD: "THRESHOLD — ₹50L to ₹1Cr/month",
    SURGE: "SURGE — ₹1Cr to ₹3Cr/month",
    COMMAND: "COMMAND — ₹3Cr to ₹10Cr/month",
    LEGACY: "LEGACY — over ₹10Cr/month",
  }
  return map[stage] ?? stage
}

function mockVerticalMedians(): Record<ForceKey, number> {
  return {
    identity: 3.0,
    x_factor: 2.8,
    marketing: 3.2,
    sales: 3.4,
    financial: 3.0,
    optimisation: 2.6,
    scale: 2.4,
    owner_energy: 2.8,
  }
}

// ─── Stub placeholders for §5-§15 ────────────────────────────
// These return an empty/templated shape so the placeholder renderer
// has a valid object to receive but doesn't read its content.

function stubStage(label: string, stage: string): LongFormReportPayload["section_05_stage"] {
  return {
    stage_key: stage as LongFormReportPayload["section_05_stage"]["stage_key"],
    stage_display_name: stage,
    stage_identity_tagline: "The Bottleneck",
    revenue_band_label: label,
    core_constraint: "",
    why_we_placed_you_here: "",
    graduation_criteria: [],
  }
}

function stubScorecard(
  scores: Record<ForceKey, number>,
  medians: Record<ForceKey, number>,
): LongFormReportPayload["section_06_scorecard"] {
  return {
    radar: { founder: scores, vertical_median: medians },
    forces: FORCE_KEYS.map((f) => ({
      force: f,
      display_label: forceLabel(f),
      score: scores[f],
      band_indicator:
        scores[f] > medians[f] + 0.4
          ? "above"
          : scores[f] < medians[f] - 0.4
            ? "below"
            : "at",
      vertical_median: medians[f],
      verdict_sentence: "",
      driven_by: { q_id: "", founder_said: "" },
    })),
  }
}

function stubNamedMove(stub: StubReportPayload): LongFormReportPayload["section_07_named_move"] {
  return {
    sprint_name: stub.named_move.title,
    promise_sentence: stub.named_move.promise,
    target_metric: { name: stub.named_move.target_metric, from: "—", to: "—" },
    diagnosis_paragraph: "",
    weeks: [],
    stop_doing_list: [],
  }
}

function stubBenchmarks(): LongFormReportPayload["section_08_benchmarks"] {
  return { rows: [], outlier_paragraphs: [] }
}

function stubCashMirror(): LongFormReportPayload["section_09_cash_mirror"] {
  return {
    waterfall: {
      revenue_in: 100,
      cost_of_delivery_out: 0,
      gross_margin_left: 0,
      marketing_out: 0,
      net_contribution: 0,
    },
    verdict_lines: [],
    cash_floor: {
      months_runway: 0,
      floor_label: "—",
      monthly_burn_rupees: 0,
    },
  }
}

function stubHiddenForce(): LongFormReportPayload["section_10_hidden_force"] {
  return { headline: "", paragraph: "", uncomfortable_questions: [] }
}

function stubDecisions(): LongFormReportPayload["section_11_decisions"] {
  return { decisions: [] }
}

function stubBootcampMap(
  primaryDay: 1 | 2 | 3,
): LongFormReportPayload["section_12_bootcamp_map"] {
  return { days: [] }
}

function stubTwoWays(): LongFormReportPayload["section_14_two_ways"] {
  return { archetype_tailored_sentence: "", options: [] }
}
