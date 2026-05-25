// 7 Forces Business Audit — the 16 diagnostic questions
// ════════════════════════════════════════════════════════════
// MVP: questions live in code, not the DB. This makes iteration
// cheap (edit a file, no migration). Once the questions stabilise,
// they can be moved into the assessment_questions table.

import type { AuditQuestion } from "./types"

export const AUDIT_QUESTIONS: AuditQuestion[] = [
  // ─── Identity Force ──────────────────────────────────────
  {
    id: "q1_icp_clarity",
    force: "identity",
    question_text:
      "Who is your one ideal customer? (In one sentence.)",
    input_type: "choice",
    options: [
      { label: "I can name a specific customer type, problem, and trigger", value: "specific", score: 5 },
      { label: "I can name a customer type and the problem I solve", value: "type_and_problem", score: 4 },
      { label: "I can name a customer type only (industry or demographic)", value: "type_only", score: 2 },
      { label: "Honestly, I sell to anyone who'll buy", value: "anyone", score: 0 },
    ],
    helper: "ICP = Ideal Customer Profile. The specific firm or person you sell BEST to — not everyone who'll pay you.",
  },

  // ─── X-Factor Force ──────────────────────────────────────
  {
    id: "q2_xfactor_source",
    force: "x_factor",
    question_text:
      "In your customers' own words, why do they pick you over the alternatives?",
    input_type: "choice",
    options: [
      { label: "I've asked them and I can quote 3+ customers verbatim", value: "verbatim", score: 5 },
      { label: "I've asked them and I have a general sense", value: "asked_general", score: 4 },
      { label: "I haven't asked, but I'm pretty sure it's price, service, or quality", value: "assumed_generic", score: 1 },
      { label: "I haven't asked. I don't really know.", value: "unknown", score: 0 },
    ],
    helper: "X-Factor = the cost you'll pay that competitors won't. The reason customers pick you over cheaper.",
  },
  {
    id: "q3_top3_concentration",
    force: "x_factor",
    question_text:
      "What percentage of your revenue comes from your top 3 customers?",
    input_type: "number",
    unit: "%",
    min_value: 0,
    max_value: 100,
    format_hint: "Enter a number between 0 and 100.",
    confidence_required: true,
  },

  // ─── Marketing Force ─────────────────────────────────────
  {
    id: "q4_lead_source",
    force: "marketing",
    question_text: "Where do most of your customers come from today?",
    input_type: "choice",
    options: [
      { label: "Word of mouth and referrals only", value: "wom_only", score: 1 },
      { label: "One paid channel that's working (ads, Google, Meta)", value: "one_paid", score: 2 },
      { label: "Two or three channels working in parallel", value: "multi_channel", score: 4 },
      { label: "A system: content + ads + SEO + referrals running together", value: "system", score: 5 },
      { label: "Inconsistent — customers come, I don't know exactly how", value: "unclear", score: 0 },
    ],
  },
  {
    id: "q5_cpl",
    force: "marketing",
    question_text:
      "Roughly, what does it cost you to get one new lead (someone who shows interest)?",
    input_type: "band",
    unit: "₹",
    confidence_required: true,
    options: [
      { label: "Under ₹100", value: "lt_100", score: 5 },
      { label: "₹100 – ₹500", value: "100_500", score: 4 },
      { label: "₹500 – ₹2,000", value: "500_2000", score: 3 },
      { label: "₹2,000 – ₹10,000", value: "2000_10000", score: 2 },
      { label: "Over ₹10,000", value: "gt_10000", score: 1 },
      { label: "I don't track this", value: "untracked", score: 0, untracked: true },
    ],
    helper: "Cost to acquire one person who shows genuine interest — not every impression.",
  },

  // ─── Sales Force ─────────────────────────────────────────
  {
    id: "q6_conversion",
    force: "sales",
    question_text:
      "Of every 10 serious enquiries, roughly how many turn into paying customers?",
    input_type: "band",
    confidence_required: true,
    options: [
      { label: "8 or more", value: "8_plus", score: 5 },
      { label: "5 – 7", value: "5_7", score: 4 },
      { label: "3 – 4", value: "3_4", score: 3 },
      { label: "1 – 2", value: "1_2", score: 2 },
      { label: "Less than 1", value: "lt_1", score: 1 },
      { label: "I don't track this", value: "untracked", score: 0, untracked: true },
    ],
  },
  {
    id: "q7_sales_cycle",
    force: "sales",
    question_text:
      "From first conversation to money in the bank, how long does a typical sale take?",
    input_type: "band",
    options: [
      { label: "Same day", value: "same_day", score: 5 },
      { label: "Within a week", value: "within_week", score: 4 },
      { label: "1 – 4 weeks", value: "1_4_weeks", score: 3 },
      { label: "1 – 3 months", value: "1_3_months", score: 2 },
      { label: "Over 3 months", value: "gt_3_months", score: 1 },
    ],
  },

  // ─── Financial Force ─────────────────────────────────────
  {
    id: "q8_revenue_lakhs",
    force: "financial",
    question_text:
      "What was your business revenue (top line) in the last 12 months?",
    input_type: "number",
    unit: "₹ lakhs",
    min_value: 1,
    max_value: 100000,
    format_hint: "Enter in lakhs. 50 = ₹50 lakhs. 250 = ₹2.5 crore.",
    confidence_required: true,
  },
  {
    id: "q9_gross_margin",
    force: "financial",
    question_text:
      "Of every ₹100 of revenue, how much is left after the direct cost of making or delivering the product/service?",
    input_type: "band",
    unit: "%",
    confidence_required: true,
    options: [
      { label: "₹70 – ₹100 left (70%+ margin)", value: "gt_70", score: 5 },
      { label: "₹50 – ₹70 left (50–70% margin)", value: "50_70", score: 4 },
      { label: "₹30 – ₹50 left (30–50% margin)", value: "30_50", score: 3 },
      { label: "₹15 – ₹30 left (15–30% margin)", value: "15_30", score: 2 },
      { label: "Under ₹15 left (under 15% margin)", value: "lt_15", score: 1 },
      { label: "I don't track this", value: "untracked", score: 0, untracked: true },
    ],
  },
  {
    id: "q10_cash_runway",
    force: "financial",
    question_text:
      "If revenue stopped today, how many months could you pay your fixed costs (salaries, rent, EMIs) from cash on hand?",
    input_type: "band",
    unit: "months",
    options: [
      { label: "Less than 1 month", value: "lt_1", score: 1 },
      { label: "1 – 3 months", value: "1_3", score: 2 },
      { label: "3 – 6 months", value: "3_6", score: 3 },
      { label: "6 – 12 months", value: "6_12", score: 4 },
      { label: "More than 12 months", value: "gt_12", score: 5 },
      { label: "I don't track this", value: "untracked", score: 0, untracked: true },
    ],
  },

  // ─── Optimisation Force ──────────────────────────────────
  {
    id: "q11_owner_hours",
    force: "optimisation",
    question_text:
      "In a typical week, how many hours do you personally work in the business?",
    input_type: "number",
    unit: "hours",
    min_value: 1,
    max_value: 120,
    format_hint: "Be honest. Including evenings and weekends.",
  },
  {
    id: "q12_headcount",
    force: "optimisation",
    question_text:
      "How many full-time people work in the business (including you)?",
    input_type: "number",
    unit: "people",
    min_value: 1,
    max_value: 5000,
  },

  // ─── Scale Force ─────────────────────────────────────────
  {
    id: "q13_bottleneck",
    force: "scale",
    question_text: "If you suddenly got 3x more demand tomorrow, what breaks first?",
    input_type: "choice",
    options: [
      { label: "My time — I'm already the bottleneck", value: "owner_time", score: 1 },
      { label: "My team — we don't have enough people or skill", value: "team", score: 2 },
      { label: "My systems — we'd lose orders, drop quality, miss things", value: "systems", score: 2 },
      { label: "My cash — I couldn't fund the inventory/payroll spike", value: "cash", score: 2 },
      { label: "My supply — I can't make or source that much that fast", value: "supply", score: 2 },
      { label: "Nothing breaks. We could absorb it.", value: "nothing", score: 5 },
    ],
  },

  // ─── Owner Energy Force ──────────────────────────────────
  {
    id: "q14_owner_energy",
    force: "owner_energy",
    question_text: "On most days, how do you feel walking into the business?",
    input_type: "choice",
    options: [
      { label: "Energised. I'm building something I love.", value: "energised", score: 5 },
      { label: "Focused but tired. Lots to do, doing it.", value: "focused_tired", score: 3 },
      { label: "Drained. Most days feel like firefighting.", value: "drained", score: 1 },
      { label: "Done. I'm thinking about exiting or quitting.", value: "done", score: 0 },
    ],
  },
  {
    id: "q15_decision_making",
    force: "owner_energy",
    question_text: "Who makes the day-to-day operational decisions in your business?",
    input_type: "choice",
    options: [
      { label: "Only me. Nothing moves without me.", value: "only_me", score: 1 },
      { label: "Me and 1–2 trusted people", value: "me_and_few", score: 3 },
      { label: "A team makes decisions, I review the big ones", value: "team_decides", score: 4 },
      { label: "I have a leadership layer that runs operations", value: "leadership_layer", score: 5 },
    ],
  },
  {
    id: "q16_founder_age",
    force: "owner_energy",
    question_text: "How old are you?",
    input_type: "number",
    unit: "years",
    min_value: 18,
    max_value: 85,
  },

  // ─── Q17: Marketing / acquisition spend (UNIVERSAL) ────────
  // Captures the missing dimension: gross margin alone misses
  // how much of that margin gets eaten by paid acquisition.
  // Combined with Q9 in scoring to compute net contribution proxy.
  {
    id: "q17_marketing_spend",
    force: "financial",
    question_text:
      "Roughly what % of revenue do you spend on marketing and customer acquisition?",
    input_type: "band",
    unit: "%",
    confidence_required: true,
    options: [
      { label: "Under 5%", value: "lt_5", score: 5 },
      { label: "5 – 15%", value: "5_15", score: 5 },
      { label: "15 – 30%", value: "15_30", score: 4 },
      { label: "30 – 50%", value: "30_50", score: 3 },
      { label: "Over 50%", value: "gt_50", score: 2 },
      { label: "I don't track this", value: "untracked", score: 0, untracked: true },
    ],
    helper: "Paid channels only — ads, agencies, Google, Meta, influencers. Not salaries.",
  },

  // ─── Q18 candidates: vertical-conditional ──────────────────
  // Exactly one of these is shown to a founder, picked by their
  // vertical via VERTICAL_Q18. Each archetype captures the
  // single most important number the universal 16 questions miss
  // for that family of business.

  // Archetype: monthly churn (SaaS / subscription)
  {
    id: "q18_monthly_churn",
    force: "financial",
    question_text:
      "Roughly what % of your customers cancel or downgrade each month?",
    input_type: "band",
    unit: "%",
    confidence_required: true,
    options: [
      { label: "Under 2%", value: "lt_2", score: 5 },
      { label: "2 – 4%", value: "2_4", score: 4 },
      { label: "4 – 7%", value: "4_7", score: 3 },
      { label: "7 – 12%", value: "7_12", score: 2 },
      { label: "Over 12%", value: "gt_12", score: 1 },
      { label: "I don't track this", value: "untracked", score: 0, untracked: true },
    ],
  },

  // Archetype: repeat / returning customer revenue %
  // (D2C, coaching, retail, prof services, events)
  {
    id: "q18_repeat_rate",
    force: "x_factor",
    question_text:
      "Roughly what % of your revenue comes from repeat or returning customers?",
    input_type: "band",
    unit: "%",
    confidence_required: true,
    options: [
      { label: "Under 10%", value: "lt_10", score: 1 },
      { label: "10 – 25%", value: "10_25", score: 2 },
      { label: "25 – 40%", value: "25_40", score: 3 },
      { label: "40 – 60%", value: "40_60", score: 4 },
      { label: "Over 60%", value: "gt_60", score: 5 },
      { label: "I don't track this", value: "untracked", score: 0, untracked: true },
    ],
  },

  // Archetype: aggregator share (restaurant — Zomato/Swiggy tax)
  {
    id: "q18_aggregator_share",
    force: "financial",
    question_text:
      "What % of your revenue comes from delivery aggregators (Zomato, Swiggy, etc.)?",
    input_type: "band",
    unit: "%",
    confidence_required: true,
    options: [
      { label: "Under 10%", value: "lt_10", score: 5 },
      { label: "10 – 25%", value: "10_25", score: 4 },
      { label: "25 – 50%", value: "25_50", score: 3 },
      { label: "50 – 75%", value: "50_75", score: 2 },
      { label: "Over 75%", value: "gt_75", score: 1 },
      { label: "I don't track this", value: "untracked", score: 0, untracked: true },
    ],
  },

  // Archetype: capacity utilisation (clinic, school — asset-heavy)
  {
    id: "q18_capacity_util",
    force: "optimisation",
    question_text:
      "Roughly what % of your seats, slots, or chairs are filled on an average day?",
    input_type: "band",
    unit: "%",
    confidence_required: true,
    options: [
      { label: "Over 90%", value: "gt_90", score: 5 },
      { label: "70 – 90%", value: "70_90", score: 4 },
      { label: "50 – 70%", value: "50_70", score: 3 },
      { label: "30 – 50%", value: "30_50", score: 2 },
      { label: "Under 30%", value: "lt_30", score: 1 },
      { label: "I don't track this", value: "untracked", score: 0, untracked: true },
    ],
  },

  // Archetype: DSO / commission days outstanding
  // (mfg, agency, broker, construction, logistics)
  {
    id: "q18_dso_days",
    force: "financial",
    question_text:
      "How many days does it take, on average, from invoice issued to money in your bank?",
    input_type: "band",
    unit: "days",
    confidence_required: true,
    options: [
      { label: "Under 15 days", value: "lt_15", score: 5 },
      { label: "15 – 30 days", value: "15_30", score: 4 },
      { label: "30 – 60 days", value: "30_60", score: 3 },
      { label: "60 – 90 days", value: "60_90", score: 2 },
      { label: "Over 90 days", value: "gt_90", score: 1 },
      { label: "I don't track this", value: "untracked", score: 0, untracked: true },
    ],
  },
]

// ─── Vertical → Q18 archetype mapping ────────────────────────
// One of the 5 Q18 candidates above gets shown to a founder
// based on what they answered for "What business are you in?"
// in the identity block. "other" inherits no Q18.
export const VERTICAL_Q18: Record<string, string | null> = {
  saas_b2b: "q18_monthly_churn",
  agency_services: "q18_dso_days",
  ecom_d2c: "q18_repeat_rate",
  coaching_courses: "q18_repeat_rate",
  manufacturing: "q18_dso_days",
  restaurant_fnb: "q18_aggregator_share",
  retail_offline: "q18_repeat_rate",
  real_estate_broker: "q18_dso_days",
  healthcare_clinic: "q18_capacity_util",
  education_school: "q18_capacity_util",
  events_weddings: "q18_repeat_rate",
  construction_interior: "q18_dso_days",
  logistics_transport: "q18_dso_days",
  professional_services: "q18_repeat_rate",
  other: null,
}

// Screen grouping — 5 question screens after the identity block.
// Split into smaller screens (3-4 questions each) to keep the form
// mobile-friendly. Q18 is appended to the "How your business runs"
// screen at render time by getScreenQuestionIds().
export const SCREEN_GROUPS: { title: string; questionIds: string[] }[] = [
  {
    title: "Your business identity",
    questionIds: ["q1_icp_clarity", "q2_xfactor_source", "q3_top3_concentration"],
  },
  {
    title: "How customers find and buy",
    questionIds: ["q4_lead_source", "q5_cpl", "q6_conversion", "q7_sales_cycle"],
  },
  {
    title: "Money and margin",
    questionIds: [
      "q8_revenue_lakhs",
      "q9_gross_margin",
      "q17_marketing_spend",
      "q10_cash_runway",
    ],
  },
  {
    title: "How your business runs",
    questionIds: ["q11_owner_hours", "q12_headcount", "q13_bottleneck"],
    // Q18 (vertical-conditional) is appended here by getScreenQuestionIds.
  },
  {
    title: "You, the founder",
    questionIds: ["q14_owner_energy", "q15_decision_making", "q16_founder_age"],
  },
]

// Returns the question IDs for a screen, including the vertical-
// conditional Q18 where applicable. Use this from the form renderer
// AND the validation pass — they must agree on what's shown.
export function getScreenQuestionIds(
  screenIndex: number,
  vertical: string | null,
): string[] {
  const baseIds = SCREEN_GROUPS[screenIndex]?.questionIds ?? []
  // Q18 only appears on screen 3 ("How your business runs").
  if (screenIndex !== 3 || !vertical) return baseIds
  const q18 = VERTICAL_Q18[vertical] ?? null
  if (!q18) return baseIds
  return [...baseIds, q18]
}

export function getQuestionById(id: string): AuditQuestion | undefined {
  return AUDIT_QUESTIONS.find((q) => q.id === id)
}
