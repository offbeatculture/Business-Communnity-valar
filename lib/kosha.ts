// ════════════════════════════════════════════════════════════
// The Panchakosha Scan — domain model, scoring, interpretation
//
// Source: "Panchakosha Program Structure & Assessment" (Dr Valarmathi)
//   6 statements per kosha · 0 (not at all true) → 5 (extremely true)
//   Each kosha totals out of 30. Highest = Primary, second = Secondary.
//
// Pure + deterministic. No fetch, no LLM, no DB.
// ════════════════════════════════════════════════════════════

export const KOSHA_SCAN_SLUG = "kosha-scan"

export const QUESTIONS_PER_KOSHA = 6
export const MAX_PER_QUESTION = 5
export const MAX_PER_KOSHA = QUESTIONS_PER_KOSHA * MAX_PER_QUESTION // 30

/**
 * Days that must pass before a member can retake the scan.
 * The before/after comparison is the renewal conversation, so the retake
 * is deliberately gated to the end of a cycle rather than left open —
 * otherwise members re-score on a whim and the comparison means nothing.
 * Admins bypass this (see the submit route).
 */
export const KOSHA_RETAKE_MIN_DAYS = 28

// ─── The five layers, in teaching order ─────────────────────
// Order matters: the deck works outward-in, densest layer first, and
// that order is also the tie-break when two koshas score equally.

export const KOSHA_KEYS = [
  "annamaya",
  "pranamaya",
  "manomaya",
  "vijnanamaya",
  "anandamaya",
] as const

export type KoshaKey = (typeof KOSHA_KEYS)[number]

export type KoshaMeta = {
  key: KoshaKey
  name: string
  sheath: string
  week: number
  /**
   * Whether a HIGH raw score means a HEALTHY layer rather than a
   * struggling one — see REVERSE-SCORING below.
   */
  reverse: boolean
}

export const KOSHAS: Record<KoshaKey, KoshaMeta> = {
  annamaya: {
    key: "annamaya",
    name: "Annamaya Kosha",
    sheath: "Food / Physical",
    week: 1,
    reverse: false,
  },
  pranamaya: {
    key: "pranamaya",
    name: "Pranamaya Kosha",
    sheath: "Breath / Life-Force",
    week: 2,
    reverse: false,
  },
  manomaya: {
    key: "manomaya",
    name: "Manomaya Kosha",
    sheath: "Mind / Emotion",
    week: 3,
    reverse: false,
  },
  vijnanamaya: {
    key: "vijnanamaya",
    name: "Vijnanamaya Kosha",
    sheath: "Wisdom / Identity",
    week: 4,
    reverse: false,
  },
  anandamaya: {
    key: "anandamaya",
    name: "Anandamaya Kosha",
    sheath: "Bliss",
    week: 5,

    // ─── REVERSE-SCORING ─────────────────────────────────────
    // The other four koshas are worded as problems ("I feel physically
    // fatigued most days"), so a high raw score = a struggling layer.
    // Anandamaya's six statements are worded as health ("I have moments
    // of genuine joy", "I feel grateful for my life as it is right now").
    //
    // Scored raw, the most content member in the community would total
    // 30/30 on Anandamaya and be told bliss is the root of their
    // symptoms — and be routed to the wrong layer.
    //
    // So we invert it: score = MAX_PER_QUESTION - answer. Now every
    // kosha reads the same way — high means "this layer needs attention".
    //
    // This is a CONFIG choice, not a code path. If Dr Valar rewords the
    // six statements to negative polarity instead, set this to false and
    // swap the question text in the migration. Nothing else changes.
    reverse: true,
  },
}

export const KOSHA_LIST: KoshaMeta[] = KOSHA_KEYS.map((k) => KOSHAS[k])

/** Kosha keys whose scores are currently inverted. Stored on each result
 *  so a later polarity change is detectable when comparing old attempts. */
export const REVERSED_KOSHAS: KoshaKey[] = KOSHA_KEYS.filter(
  (k) => KOSHAS[k].reverse
)

export function isKoshaKey(value: string): value is KoshaKey {
  return (KOSHA_KEYS as readonly string[]).includes(value)
}

// ─── Bands ──────────────────────────────────────────────────
// Straight from the deck's "Scoring & Interpretation" slide.

export type BandKey = "balanced" | "moderate" | "significant"

export type Band = {
  key: BandKey
  label: string
  meaning: string
  /** Tailwind classes — warm Valar palette. */
  bar: string
  text: string
  chip: string
}

export const BANDS: Record<BandKey, Band> = {
  balanced: {
    key: "balanced",
    label: "Balanced",
    meaning: "This layer is relatively balanced right now — light-touch maintenance is enough.",
    bar: "bg-[#6F7358]",
    text: "text-[#59603F]",
    chip: "border-[#6F7358]/30 bg-[#6F7358]/10 text-[#59603F]",
  },
  moderate: {
    key: "moderate",
    label: "Moderate",
    meaning: "Moderate imbalance — this layer needs consistent weekly practice.",
    bar: "bg-[#C89B3C]",
    text: "text-[#8A6A22]",
    chip: "border-[#C89B3C]/40 bg-[#C89B3C]/10 text-[#8A6A22]",
  },
  significant: {
    key: "significant",
    label: "Significant",
    meaning:
      "Significant imbalance — this is very likely the root of current physical or emotional symptoms, and where to focus first.",
    bar: "bg-[#B4532A]",
    text: "text-[#8E3F1F]",
    chip: "border-[#B4532A]/40 bg-[#B4532A]/10 text-[#8E3F1F]",
  },
}

export function bandFor(score: number): Band {
  if (score <= 10) return BANDS.balanced
  if (score <= 20) return BANDS.moderate
  return BANDS.significant
}

/** A drop of this many points on the primary kosha is the progress
 *  marker the program promises members at reassessment. */
export const MEANINGFUL_DROP = 5

// ─── Scoring ────────────────────────────────────────────────

export type KoshaScores = Record<KoshaKey, number>

export type KoshaScoreBlob = {
  type: "kosha"
  koshas: KoshaScores
  maxPerKosha: number
  primary: KoshaKey
  secondary: KoshaKey
  /** Which koshas were inverted when this attempt was scored. */
  reversed: KoshaKey[]
}

/**
 * Score one answer for one kosha, applying that kosha's polarity.
 * `raw` is the 0–5 the member selected.
 */
export function scoreAnswer(kosha: KoshaKey, raw: number): number {
  const clamped = Math.max(0, Math.min(MAX_PER_QUESTION, raw))
  return KOSHAS[kosha].reverse ? MAX_PER_QUESTION - clamped : clamped
}

export function emptyScores(): KoshaScores {
  return KOSHA_KEYS.reduce((acc, k) => {
    acc[k] = 0
    return acc
  }, {} as KoshaScores)
}

/**
 * Primary = highest score. Secondary = next highest.
 * Ties break by teaching order (densest layer first), which is both
 * deterministic and consistent with how the program sequences work.
 */
export function rankKoshas(scores: KoshaScores): KoshaKey[] {
  return [...KOSHA_KEYS].sort((a, b) => {
    const diff = scores[b] - scores[a]
    if (diff !== 0) return diff
    return KOSHA_KEYS.indexOf(a) - KOSHA_KEYS.indexOf(b)
  })
}

export function buildScoreBlob(scores: KoshaScores): KoshaScoreBlob {
  const ranked = rankKoshas(scores)
  return {
    type: "kosha",
    koshas: scores,
    maxPerKosha: MAX_PER_KOSHA,
    primary: ranked[0],
    secondary: ranked[1],
    reversed: REVERSED_KOSHAS,
  }
}

/** Narrow an untyped `scores` jsonb into a kosha blob, or null. */
export function asKoshaScoreBlob(scores: unknown): KoshaScoreBlob | null {
  if (!scores || typeof scores !== "object") return null
  const blob = scores as Partial<KoshaScoreBlob>
  if (blob.type !== "kosha" || !blob.koshas) return null
  if (!blob.primary || !isKoshaKey(blob.primary)) return null
  return blob as KoshaScoreBlob
}

// ─── Before / after comparison ──────────────────────────────

export type KoshaDelta = {
  kosha: KoshaMeta
  before: number
  after: number
  /** Negative = improvement (the layer quietened down). */
  delta: number
  beforeBand: Band
  afterBand: Band
  improved: boolean
}

export type KoshaComparison = {
  deltas: KoshaDelta[]
  /** The kosha that was primary at intake — the one we promised to move. */
  originalPrimary: KoshaDelta
  /** Primary as of the later attempt. */
  currentPrimary: KoshaDelta
  primaryChanged: boolean
  /** Did the original primary drop by the meaningful margin? */
  meaningfulShift: boolean
  totalBefore: number
  totalAfter: number
  /**
   * True when the two attempts were scored under different polarity
   * config — the numbers are then not directly comparable.
   */
  polarityMismatch: boolean
}

export function compareAttempts(
  before: KoshaScoreBlob,
  after: KoshaScoreBlob
): KoshaComparison {
  const deltas: KoshaDelta[] = KOSHA_KEYS.map((key) => {
    const b = before.koshas[key] ?? 0
    const a = after.koshas[key] ?? 0
    return {
      kosha: KOSHAS[key],
      before: b,
      after: a,
      delta: a - b,
      beforeBand: bandFor(b),
      afterBand: bandFor(a),
      improved: a < b,
    }
  })

  const byKey = (k: KoshaKey) => deltas.find((d) => d.kosha.key === k)!
  const originalPrimary = byKey(before.primary)
  const currentPrimary = byKey(after.primary)

  const sortedBefore = [...(before.reversed ?? [])].sort()
  const sortedAfter = [...(after.reversed ?? [])].sort()

  return {
    deltas,
    originalPrimary,
    currentPrimary,
    primaryChanged: before.primary !== after.primary,
    meaningfulShift: originalPrimary.before - originalPrimary.after >= MEANINGFUL_DROP,
    totalBefore: KOSHA_KEYS.reduce((s, k) => s + (before.koshas[k] ?? 0), 0),
    totalAfter: KOSHA_KEYS.reduce((s, k) => s + (after.koshas[k] ?? 0), 0),
    polarityMismatch: sortedBefore.join(",") !== sortedAfter.join(","),
  }
}

// ─── Retake eligibility ─────────────────────────────────────

export type RetakeStatus = {
  eligible: boolean
  daysRemaining: number
  availableOn: Date
}

export function retakeStatus(
  lastCompletedAt: string | Date,
  now: Date = new Date()
): RetakeStatus {
  const last = new Date(lastCompletedAt)
  const availableOn = new Date(last)
  availableOn.setDate(availableOn.getDate() + KOSHA_RETAKE_MIN_DAYS)

  const msRemaining = availableOn.getTime() - now.getTime()
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / 86_400_000))

  return {
    eligible: msRemaining <= 0,
    daysRemaining,
    availableOn,
  }
}

/**
 * Dr Valar's framing, kept verbatim from the deck. Shown on every
 * results screen — this is a wellbeing reflection, not a diagnosis.
 */
export const SCAN_DISCLAIMER =
  "Observe without labelling yourself. This is not a medical or psychological diagnosis. A score is feedback — not a statement of your worth."
