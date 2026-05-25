// ════════════════════════════════════════════════════════════
// Long-form Scale Code Diagnostic — Report Payload (v1)
// ════════════════════════════════════════════════════════════
//
// The structured shape that:
//   - the stub generator templates today (Phase 4 spike — most slots
//     filled deterministically from form answers, prose slots are
//     placeholders)
//   - the Mac-daemon Claude prompt will fill end-to-end (Phase 3)
//   - the PDF renderer consumes to produce the 20-page report
//
// Authoring rule (matches report-spec anti-padding rules 1-10):
// every prose field must be auditable to a specific Q-id or
// deterministic engine output. Generic content has no place here.
//
// Section numbering matches long-form-assessment-report-spec-v1.md.

import type { ForceKey } from "@/lib/audit/types"

// ─── Top-level payload ───────────────────────────────────────

export type LongFormReportPayload = {
  // Versioning so the renderer can branch on payload shape changes
  // and the Claude prompt can know which schema to target.
  version: "long-form-v1"

  meta: ReportMeta

  // The 15 sections, in order. Each is structured -- the PDF
  // renderer never invents content; it only formats what's here.
  section_01_snapshot: SnapshotSection
  section_02_verdict: VerdictSection
  section_03_archetype: ArchetypeSection
  section_04_lie: LieSection
  section_05_stage: StageSection
  section_06_scorecard: ScorecardSection
  section_07_named_move: NamedMoveSection
  section_08_benchmarks: BenchmarksSection
  section_09_cash_mirror: CashMirrorSection
  section_10_hidden_force: HiddenForceSection
  section_11_decisions: DecisionsSection
  section_12_bootcamp_map: BootcampMapSection
  section_13_reread_bookmark: RereadBookmarkSection
  section_14_two_ways: TwoWaysSection
  section_15_didnt_cover: DidntCoverSection

  appendix_a_answers: AppendixAnswers
  appendix_b_glossary: AppendixGlossary
}

// ─── Meta ────────────────────────────────────────────────────

export type ReportMeta = {
  founder: {
    full_name: string
    first_name: string
    business_name: string
    city: string | null
    email: string
  }
  vertical: string // VerticalValue
  vertical_label: string
  stage_band: string // "SPARK_GRIP" | "STRIDE" | ... — derived
  generated_at: string // ISO timestamp
  // Banner that appears on every page footer until Phase 3 ships
  // real Claude content. Empty string means production-ready.
  watermark: string | null
}

// ─── Section 1: Snapshot (1 page) ────────────────────────────
//
// The wall page. 6 fixed cells. Screenshot-to-spouse summary.

export type SnapshotSection = {
  // Top-third block
  audit_date_label: string // e.g. "25 May 2026"
  stage_band_label: string // e.g. "STRIDE — ₹1Cr to ₹2Cr"

  // Middle: 8-pillar depth bars (force scores)
  scores: Record<ForceKey, number> // 0-5
  stage_target_line: number // 0-5 — overlaid as a benchmark

  // Bottom: 3 callout boxes
  named_move_callout: {
    title: string
    one_liner: string // 12 words max
  }
  the_leak_callout: {
    label: string // "The Leak" or vertical-specific phrasing
    one_number: string // e.g. "₹2.4L/month" — single most-quotable number
    sub: string // 8 words context
  }
  the_lie_callout: {
    name: string // e.g. "The Marketing Lie"
    one_liner: string // 12 words max
  }
}

// ─── Section 2: 90-Second Verdict (1 page) ───────────────────

export type VerdictSection = {
  // One 24pt sentence — the whole verdict in one line.
  headline_sentence: string

  // 3 short paragraphs underneath. Each ~50-60 words. Each must
  // quote a specific number or answer from the founder.
  strongest_paragraph: string // strongest force, with evidence
  weakest_paragraph: string // weakest force, with evidence
  single_move_paragraph: string // the named move, with evidence

  // Footer line.
  if_you_do_nothing_else: string // 12 words max
}

// ─── Section 3: Founder Archetype (2 pages) ──────────────────

export type ArchetypeSection = {
  // Page 1
  archetype_key:
    | "grinder"
    | "inheritor"
    | "migrator"
    | "name"
    | "rainmakers_firm"
    | "institution"
    | "architect"
  archetype_display_name: string // e.g. "The Rainmaker's Firm"
  description_paragraph: string // ~200 words
  favourite_move: string // "What this archetype always reaches for — which is what got you stuck"

  // Page 2
  why_we_placed_you_here: ArchetypeEvidence[] // 3-4 specific bullets quoting answers
  flirts_with: ArchetypeRunnerUp[] // 2 entries — runners-up acknowledgement

  // For the 2-axis grid visual on p2:
  // x = demand source (founder_chasing ↔ systemic_pipeline)
  // y = founder dependence (high ↔ low)
  grid_position: {
    x: number // 0-1
    y: number // 0-1
  }
}

export type ArchetypeEvidence = {
  q_id: string // "q19_business_naming"
  founder_said: string // their answer label
  why_it_matters: string // ~20 words
}

export type ArchetypeRunnerUp = {
  archetype_key: ArchetypeSection["archetype_key"]
  display_name: string
  ack_paragraph: string // ~50 words
}

// ─── Section 4: The Lie You Hold (1.5 pages) ─────────────────

export type LieSection = {
  lie_key:
    | "identity_trap"
    | "x_factor_hunt"
    | "death_spiral"
    | "marketing_lie"
    | "sales_lie"
    | "conversion_lie"
    | "profit_lie"
    | "growth_lie"
    | "freedom_lie"
  lie_display_name: string // "The Marketing Lie" -- display headline

  // "Why we think you hold this" -- 3 specific evidence lines.
  evidence: LieEvidence[]

  // What it's costing you -- one paragraph with rupee/hour/customer
  // figures. ~80 words.
  cost_paragraph: string

  // The contradiction -- one italic sentence pairing what they SAY
  // with what their numbers SAY. Critical to the section.
  contradiction: {
    you_say: string
    your_numbers_say: string
  }
}

export type LieEvidence = {
  q_id: string
  founder_said: string
  inference: string // ~20 words — what we infer
}

// ─── Section 5: Stage Placement (1.5 pages) ──────────────────

export type StageSection = {
  stage_key:
    | "SPARK"
    | "GRIP"
    | "STRIDE"
    | "THRESHOLD"
    | "SURGE"
    | "COMMAND"
    | "LEGACY"
  stage_display_name: string
  stage_identity_tagline: string // "The Bottleneck" / "The Closer" / etc.
  revenue_band_label: string // "₹0L - ₹20L / month"
  core_constraint: string // ~40 words

  why_we_placed_you_here: string // ~120 words referencing specific answers
  graduation_criteria: string[] // 3 measurable items
}

// ─── Section 6: 8-Force Scorecard (3 pages) ──────────────────

export type ScorecardSection = {
  // For the radar chart on page 1
  radar: {
    founder: Record<ForceKey, number> // 0-5
    vertical_median: Record<ForceKey, number> // 0-5
  }
  // Per-force blocks (8 entries — one per ForceKey, in spec order)
  forces: ScorecardForceBlock[]
}

export type ScorecardForceBlock = {
  force: ForceKey
  display_label: string
  score: number // 0-5
  band_indicator: "below" | "at" | "above" // vs vertical median
  vertical_median: number // 0-5
  verdict_sentence: string // ~25 words in industry vocabulary
  driven_by: {
    q_id: string
    founder_said: string
  }
}

// ─── Section 7: The Named Move / 90-Day Sprint (2 pages) ─────

export type NamedMoveSection = {
  // Page 1
  sprint_name: string // e.g. "The Pipeline Reset"
  promise_sentence: string // "In 90 days, X."
  target_metric: {
    name: string // "Qualified pipeline / week"
    from: string // "11"
    to: string // "25+"
  }
  diagnosis_paragraph: string // ~50 words — references specific numbers

  // Page 2 — 4-week timeline
  weeks: NamedMoveWeek[] // 4 entries: Diagnose / Intervene / Scale / Lock
  stop_doing_list: string[] // 3-5 items specific to their answers
}

export type NamedMoveWeek = {
  week_label: "Week 1 — Diagnose" | "Week 2 — Intervene" | "Week 3 — Scale" | "Week 4 — Lock"
  one_liner: string // ~15 words
  bullets: string[] // 3-4 specific actions
}

// ─── Section 8: Vertical Benchmarks (1.5 pages) ──────────────

export type BenchmarksSection = {
  // 6-row comparison table
  rows: BenchmarkRow[]
  outlier_paragraphs: string[] // 2 paragraphs on metrics where they're an outlier
}

export type BenchmarkRow = {
  metric: string // e.g. "Gross margin %"
  founder_value: string // "32%"
  vertical_median: string // "45%"
  top_quartile: string // "60%+"
  position: "below_median" | "near_median" | "above_median" | "top_quartile"
}

// ─── Section 9: Cash Mirror (2 pages) ────────────────────────
//
// The ₹100 waterfall — single most-quotable image in the report.

export type CashMirrorSection = {
  // The waterfall — flow of ₹100 of revenue
  waterfall: {
    revenue_in: number // always 100
    cost_of_delivery_out: number // ₹
    gross_margin_left: number // ₹
    marketing_out: number // ₹
    net_contribution: number // ₹ — the final number
  }
  // Page 2
  verdict_lines: string[] // 4 short verdict sentences
  cash_floor: {
    months_runway: number
    floor_label: string // "Below the floor" / "At the floor" / "Above the floor"
    monthly_burn_rupees: number
  }
}

// ─── Section 10: Hidden Force Reveal (1 page) ────────────────

export type HiddenForceSection = {
  headline: string // e.g. "Your business is 68% dependent on YOU."
  paragraph: string // ~120 words
  // 2 questions the founder should be able to answer but probably can't
  uncomfortable_questions: string[]
}

// ─── Section 11: Three Decisions (1 page) ────────────────────

export type DecisionsSection = {
  decisions: DecisionBlock[] // 3 entries
}

export type DecisionBlock = {
  decision: string // founder-language framing
  recommended_answer: string // ~30 words
  defended_by_sections: string[] // e.g. ["§6 Scorecard", "§10 Hidden Force"]
  recommended_call: string // "Bootcamp Day 1" / "₹5K 1-2-1" / "Membership pod"
}

// ─── Section 12: Bootcamp Map (1.5 pages) ────────────────────

export type BootcampMapSection = {
  days: BootcampDayRow[] // 3 entries
}

export type BootcampDayRow = {
  day_label: "Day 1 — Identity & X-Factor" | "Day 2 — Marketing & Sales" | "Day 3 — Financial, Optimisation, Scale, Owner Energy"
  gaps_fixed: string[] // bullets — specific gaps this day fixes
  playbook_deliverable: string // what they walk out with
  estimated_impact: string // in their numbers
}

// ─── Section 13: 90-Day Reread Bookmark (0.5 page) ───────────

export type RereadBookmarkSection = {
  reread_date: string // e.g. "23 August 2026" — 90 days from now
  numbers_to_move: RereadMetric[] // 5 entries
}

export type RereadMetric = {
  metric_name: string
  current_value: string
  target_value: string
}

// ─── Section 14: Two Ways To Act (0.5 page) ──────────────────

export type TwoWaysSection = {
  archetype_tailored_sentence: string // 1 sentence — natural fit for THIS founder
  options: ActOption[] // 3 entries: Bootcamp / 1-2-1 / Membership
}

export type ActOption = {
  format: string
  what_you_get: string
  best_for: string
  investment: string
  whatsapp_deeplink: string | null // optional CTA URL
}

// ─── Section 15: Didn't Cover (0.5 page) ─────────────────────

export type DidntCoverSection = {
  // 3-4 bullets — things this form-driven report can't see
  blind_spots: string[]
}

// ─── Appendix A: Answer Record ───────────────────────────────

export type AppendixAnswers = {
  rows: AnswerRecordRow[] // one per scored question
}

export type AnswerRecordRow = {
  q_id: string
  q_number: string // e.g. "Q19"
  question_text: string
  founder_answer: string
  score_contributed: number
}

// ─── Appendix B: Glossary + Methodology ──────────────────────

export type AppendixGlossary = {
  terms: GlossaryTerm[]
  methodology_note: string // ~50 words
  engine_version: string // e.g. "v1 (Phase 4 spike)"
}

export type GlossaryTerm = {
  term: string
  definition: string
}
