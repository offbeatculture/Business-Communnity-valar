// Long-form assessment — screen / section organization
// ════════════════════════════════════════════════════════════
// One section per Force (8) + a cross-checks section (9).
// Questions are referenced by Q-ID only; their definitions live in
// `lib/assessment/questions.ts` (Agent A). This file mirrors the
// pattern in `lib/audit/questions.ts` SCREEN_GROUPS, extended for
// the long-form bank (~99 questions).
//
// Vertical-conditional Q18 routing MUST stay consistent with
// VERTICAL_Q18 in `@/lib/audit/questions` — see the per-section
// `vertical_conditional` maps below.

import type { VerticalValue } from "@/lib/audit/types"

export type SectionGroup = {
  /** Section title shown above the question stack on this screen. */
  title: string
  /** Optional one-liner shown under the title (frames the section). */
  subtitle?: string
  /** Universal question IDs that appear on this screen for every founder. */
  question_ids: string[]
  /** Optional: vertical-conditional Q-IDs (e.g. one of the Q18 candidates) appended per founder. */
  vertical_conditional?: {
    [vertical in VerticalValue]?: string
  }
}

export const SCREEN_GROUPS: readonly SectionGroup[] = [
  // ─── Section 1: Identity ─────────────────────────────────
  {
    title: "Identity — what business are you really in?",
    subtitle: "Day 1, Hour 1 of the bootcamp. The Identity Trap.",
    question_ids: [
      "q1_icp_clarity",
      "q19_business_naming",
      "q20_disappearance_days",
      "q21_best_in_city",
      "q22_three_identities_rhyme",
      "q23_who_we_serve_subtraction",
      "q24_customer_change_named",
      "q25_self_rated_identity_clarity",
      "q26_kodak_check",
      "q27_inherited_definition",
    ],
  },

  // ─── Section 2: X-Factor ─────────────────────────────────
  {
    title: "X-Factor — the cost competitors won't pay",
    subtitle: "Day 1, Hour 2. The Willingness Hour.",
    question_ids: [
      "q2_xfactor_source",
      "q3_top3_concentration",
      "q28_cost_type",
      "q29_disappearance_suffer",
      "q30_competitor_refusal",
      "q31_imitable_in_30_days",
      "q32_customer_feels_it",
      "q33_referral_sentence",
      "q34_uncopyable_proof",
      "q35_self_rated_xfactor_strength",
      "q36_excuse_translation",
    ],
    // q18_repeat_rate lives here because retention is the X-Factor proxy
    // for transactional / repeat-purchase businesses.
    vertical_conditional: {
      ecom_d2c: "q18_repeat_rate",
      coaching_courses: "q18_repeat_rate",
      retail_offline: "q18_repeat_rate",
      events_weddings: "q18_repeat_rate",
      professional_services: "q18_repeat_rate",
    },
  },

  // ─── Section 3: Marketing ────────────────────────────────
  {
    title: "Marketing — what you stand for",
    subtitle: "Day 2, Hour 1. The Marketing Lie.",
    question_ids: [
      "q4_lead_source",
      "q5_cpl",
      "q17_marketing_spend",
      "q37_two_word_position",
      "q38_customer_one_liner",
      "q39_stack_layer_dominant",
      "q40_three_sacrifices",
      "q41_marketing_burn_pattern",
      "q42_pattern_diagnosis",
      "q43_doorway_picked",
      "q44_wom_diagnosis",
      "q45_self_rated_position_clarity",
    ],
  },

  // ─── Section 4: Sales ────────────────────────────────────
  {
    title: "Sales — investigation before pitching",
    subtitle: "Day 2, Hours 2 + 3. The Sales Lie + Conversion Lie.",
    question_ids: [
      "q6_conversion",
      "q7_sales_cycle",
      "q46_offer_strength",
      "q47_xyz_guarantee",
      "q48_disqualification_practice",
      "q49_investigation_ratio",
      "q50_implication_questions",
      "q51_lost_deal_diagnosis",
      "q52_continuation_count",
      "q53_trust_leak",
      "q54_self_rated_close_skill",
    ],
  },

  // ─── Section 5: Financial ────────────────────────────────
  {
    title: "Financial — the Profit Lie",
    subtitle: "Day 3, Hour 1. Corrected pretax + Profit First.",
    question_ids: [
      "q8_revenue_lakhs",
      "q9_gross_margin",
      "q10_cash_runway",
      "q55_owner_salary",
      "q56_bus_test_wage",
      "q57_corrected_pretax",
      "q58_account_separation",
      "q59_profit_allocation",
      "q60_owner_drawing_predictability",
      "q61_pricing_basis",
      "q62_avoidance_pattern",
      "q63_self_rated_financial_clarity",
    ],
    // q18_dso_days lives here because DSO is a financial / cash-cycle metric.
    vertical_conditional: {
      agency_services: "q18_dso_days",
      manufacturing: "q18_dso_days",
      real_estate_broker: "q18_dso_days",
      construction_interior: "q18_dso_days",
      logistics_transport: "q18_dso_days",
    },
  },

  // ─── Section 6: Optimisation ─────────────────────────────
  {
    title: "Optimisation — naming your Herbie",
    subtitle: "Day 3, Hour 2. Goldratt's 5 focusing steps.",
    question_ids: [
      "q11_owner_hours",
      "q12_headcount",
      "q64_herbie_named",
      "q65_effort_location",
      "q66_exploit_before_elevate",
      "q67_three_ways_pattern",
      "q68_inertia_policy",
      "q69_value_chain_mapped",
      "q70_subordinate_discipline",
      "q71_throughput_metric",
      "q72_self_rated_bottleneck_clarity",
    ],
    // q18_capacity_util lives here — capacity utilisation IS the
    // bottleneck reveal for asset-heavy verticals.
    vertical_conditional: {
      healthcare_clinic: "q18_capacity_util",
      education_school: "q18_capacity_util",
    },
  },

  // ─── Section 7: Scale ────────────────────────────────────
  {
    title: "Scale — climbing off Rung 1",
    subtitle: "Day 3, Hour 3 (Part 1). Martell's Replacement Ladder.",
    question_ids: [
      "q13_bottleneck",
      "q73_vacation_test",
      "q74_only_i_can",
      "q75_replacement_ladder_order",
      "q76_buyback_rate_aware",
      "q77_warrillow_three_criteria",
      "q78_founder_as_asset_risk",
      "q79_named_productized_offering",
      "q80_sellable_in_90_days",
    ],
  },

  // ─── Section 8: Owner Energy ─────────────────────────────
  {
    title: "Owner Energy — the Freedom Lie",
    subtitle: "Day 3, Hour 3 (Part 2). McKeown + Newport.",
    question_ids: [
      "q14_owner_energy",
      "q15_decision_making",
      "q16_founder_age",
      "q81_whatsapp_denominator",
      "q82_deep_work_hours",
      "q83_vital_few_named",
      "q84_last_subtraction",
      "q85_phone_first_thing",
      "q86_sleep_predictability",
      "q87_say_no_practice",
      "q88_protected_thinking_time",
      "q89_freedom_subtraction_admission",
    ],
    // q18_monthly_churn (SaaS retention) and q18_aggregator_share
    // (restaurant dependency) both live here because they speak to
    // the systemic owner-energy killer for those verticals.
    // Routing mirrors VERTICAL_Q18 exactly.
    vertical_conditional: {
      saas_b2b: "q18_monthly_churn",
      restaurant_fnb: "q18_aggregator_share",
    },
  },

  // ─── Section 9: Cross-checks ─────────────────────────────
  // QX4/QX5/QX6 used to live here but asked founders to recall their
  // answers from 8 screens ago — bad UX. Removed; the report's
  // detectTensions() computes those cross-checks from the actual answers.
  {
    title: "Cross-checks — how the forces hang together",
    subtitle: "Three final questions to pull it all together.",
    question_ids: [
      "qx1_first_fix_priority",
      "qx2_painful_money_lever",
      "qx3_layer0_to_force5",
    ],
  },
]

/**
 * Returns the ordered list of Q-IDs that should appear on screen N
 * (0-indexed into SCREEN_GROUPS) for a given founder's vertical.
 * Appends the vertical-conditional Q-ID (if any) to the universal set.
 */
export function getAssessmentScreenQuestionIds(
  screenIndex: number,
  vertical: VerticalValue | null,
): string[] {
  const group = SCREEN_GROUPS[screenIndex]
  if (!group) return []
  const ids = [...group.question_ids]
  if (vertical && group.vertical_conditional?.[vertical]) {
    ids.push(group.vertical_conditional[vertical]!)
  }
  return ids
}

/**
 * The total number of screens including the identity block (screen 0)
 * plus the 9 question screens.
 */
export const TOTAL_ASSESSMENT_SCREENS = 1 + SCREEN_GROUPS.length
