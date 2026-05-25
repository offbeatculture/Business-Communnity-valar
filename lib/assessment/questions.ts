// 7 Forces Long-Form Assessment — Question Bank v1
// ════════════════════════════════════════════════════════════
// Source of truth: workshops/Business Bootcamp - 1/v2-7-forces/
//   membership/long-form-assessment-question-bank-v1.md
//
// Composition:
//   • 17 universal questions + 5 vertical-conditional Q18 candidates
//     re-exported from lib/audit/questions (the existing short audit
//     bank — kept identical so the scoring engine stays untouched).
//   • 77 new long-form questions (Q19 → Q89 + QX1–QX6) added below,
//     grouped by Force in the same style as the audit file.
//
// Note: SCREEN_GROUPS / getScreenQuestionIds are intentionally NOT
// re-exported here — long-form screen organisation lives in
// lib/assessment/sections.ts (built by a separate agent).

import { AUDIT_QUESTIONS, VERTICAL_Q18, getQuestionById } from "@/lib/audit/questions"
import type { AuditQuestion, ForceKey } from "@/lib/audit/types"

// ════════════════════════════════════════════════════════════
// 77 new long-form questions
// ════════════════════════════════════════════════════════════

const NEW_QUESTIONS: AuditQuestion[] = [
  // ─── Force 1: Identity ───────────────────────────────────
  // (Bootcamp: Day 1, Hour 1 — "The Identity Trap")

  {
    id: "q19_business_naming",
    force: "identity",
    question_text:
      "When a stranger asks 'what business are you in?', which answer is closest to yours?",
    input_type: "choice",
    options: [
      {
        value: "outcome_named",
        label:
          "The specific change I create in the customer's life (e.g. 'parents sleep easier about their kid's JEE prep')",
        score: 5,
      },
      {
        value: "category_named",
        label:
          "The category I serve (e.g. 'IT services for mid-size manufacturers')",
        score: 3,
      },
      {
        value: "job_title",
        label: "My job title (e.g. 'I'm a CA / coach / dentist / fabricator')",
        score: 1,
      },
      {
        value: "spec_sheet",
        label:
          "What I make or sell, with specs (e.g. 'I sell 7-ply stainless steel cookware')",
        score: 1,
      },
      {
        value: "receipt",
        label: "Who pays my invoice (e.g. 'I'm B2B / I sell to retailers')",
        score: 1,
      },
      {
        value: "quality_trust",
        label: "Quality and trust / customer service / excellence",
        score: 0,
      },
    ],
    helper:
      "Pick the answer closest to how you actually describe it.",
  },
  {
    id: "q20_disappearance_days",
    force: "identity",
    question_text:
      "If you vanished from your business tomorrow (hospital, holiday, no contact), how many days before revenue drops?",
    input_type: "band",
    options: [
      { value: "lt_3", label: "Under 3 days", score: 1 },
      { value: "3_7", label: "3 to 7 days", score: 2 },
      { value: "7_30", label: "7 to 30 days", score: 3 },
      { value: "30_90", label: "30 to 90 days", score: 4 },
      {
        value: "gt_90",
        label: "More than 90 days — it could run for a quarter without me",
        score: 5,
      },
    ],
    helper: "Honest number, not the wish number.",
  },
  {
    id: "q21_best_in_city",
    force: "identity",
    question_text:
      "Name the ONE thing your business could be undisputed best in your city at.",
    input_type: "choice",
    options: [
      {
        value: "specific_narrow",
        label: "I can name one specific narrow thing",
        score: 5,
      },
      {
        value: "specific_broad",
        label: "I can name something but it's still broad",
        score: 3,
      },
      {
        value: "vague_slogan",
        label: "Something like 'quality service' or 'customer experience'",
        score: 1,
      },
      { value: "blank", label: "Honestly, I can't name one thing", score: 0 },
    ],
    helper: "Narrow enough to be credible. 'Best service' fails. 'Best JEE coaching without burnout' works.",
  },
  {
    id: "q22_three_identities_rhyme",
    force: "identity",
    question_text:
      "Do your answers to 'what business', 'who runs it', and 'what you could be best at' tell ONE coherent story?",
    input_type: "choice",
    options: [
      { value: "rhyme", label: "Yes — they reinforce each other", score: 5 },
      { value: "partial", label: "Two of three line up; one is off", score: 3 },
      {
        value: "fight",
        label:
          "They contradict — I'm running three different businesses inside one",
        score: 1,
      },
      { value: "never_thought", label: "Never lined them up", score: 0 },
    ],
  },
  {
    id: "q23_who_we_serve_subtraction",
    force: "identity",
    question_text:
      "In the last 12 months, how many customer types or service lines have you deliberately STOPPED serving?",
    input_type: "choice",
    options: [
      { value: "three_plus", label: "Three or more", score: 5 },
      { value: "one_two", label: "One or two", score: 3 },
      {
        value: "none_intentional",
        label: "None — but I've thought about it",
        score: 1,
      },
      {
        value: "none_grow",
        label: "None — I take whatever business I can get",
        score: 0,
      },
    ],
  },
  {
    id: "q24_customer_change_named",
    force: "identity",
    question_text:
      "Can your customer fill: 'Because of them, I now ____' with one specific change?",
    input_type: "choice",
    options: [
      {
        value: "specific_change",
        label: "Yes — they can name one specific change in their life",
        score: 5,
      },
      {
        value: "outcome_general",
        label: "They'd describe a general outcome, not a specific change",
        score: 3,
      },
      {
        value: "feature",
        label: "They'd name a feature of what I sell, not a change",
        score: 1,
      },
      {
        value: "cannot_fill",
        label: "Honestly, they couldn't fill that blank",
        score: 0,
      },
    ],
    helper: "Outcome test: can they name ONE change in their life — or just list your features?",
  },
  {
    id: "q25_self_rated_identity_clarity",
    force: "identity",
    question_text:
      "On 1-5, how clearly can you state the business you're actually in?",
    input_type: "choice",
    options: [
      { value: "1", label: "1 — totally fuzzy", score: 1 },
      { value: "2", label: "2 — vague, still searching", score: 2 },
      { value: "3", label: "3 — roughly clear", score: 3 },
      { value: "4", label: "4 — sharp, can articulate it", score: 4 },
      {
        value: "5",
        label: "5 — crystal clear, one sentence, every time",
        score: 5,
      },
    ],
  },
  {
    id: "q26_kodak_check",
    force: "identity",
    question_text:
      "In the last 3 years, has a competitor or new format made you re-think what business you're actually in?",
    input_type: "choice",
    options: [
      {
        value: "yes_repositioned",
        label: "Yes — and I actively repositioned",
        score: 5,
      },
      {
        value: "yes_no_action",
        label: "Yes — but I haven't done anything about it",
        score: 2,
      },
      {
        value: "noticed_dismissed",
        label: "I noticed something, dismissed it",
        score: 1,
      },
      { value: "no_threat", label: "No real threat I'm aware of", score: 1 },
    ],
    helper:
      "Think Ola/Uber to the colony taxi, Jio to BSNL, Blinkit to the kirana.",
  },
  {
    id: "q27_inherited_definition",
    force: "identity",
    question_text: "How was your current definition of the business set?",
    input_type: "choice",
    options: [
      {
        value: "deliberate_recent",
        label: "I deliberately set it recently",
        score: 5,
      },
      {
        value: "deliberate_old",
        label: "I deliberately set it once, years ago",
        score: 3,
      },
      {
        value: "inherited",
        label: "Inherited from family / a previous role",
        score: 1,
      },
      {
        value: "default",
        label: "Default — it's just what I started doing",
        score: 0,
      },
    ],
  },

  // ─── Force 2: X-Factor ───────────────────────────────────
  // (Bootcamp: Day 1, Hour 2 — "The Willingness Hour / 3 Costs")

  {
    id: "q28_cost_type",
    force: "x_factor",
    question_text:
      "Which of the 3 costs are you actively paying that your nearest competitor refuses to pay?",
    input_type: "choice",
    options: [
      {
        value: "comfort",
        label:
          "COMFORT — I do something personally uncomfortable that my customer experiences directly",
        score: 5,
      },
      {
        value: "time",
        label:
          "TIME — I spend time that doesn't scale on something the customer feels",
        score: 5,
      },
      {
        value: "money",
        label:
          "MONEY — I spend on something with no clear ROI that the customer holds in their hand",
        score: 5,
      },
      { value: "none_yet", label: "None of these — yet", score: 0 },
      {
        value: "working_volume",
        label:
          "I work harder but the customer doesn't directly experience it",
        score: 1,
      },
    ],
    helper: "Three specific costs a competitor wouldn't pay that your customer directly feels.",
  },
  {
    id: "q29_disappearance_suffer",
    force: "x_factor",
    question_text:
      "If you closed tomorrow, how many specific customers (by first name) would actively SUFFER?",
    input_type: "choice",
    options: [
      { value: "three", label: "Three or more I can name right now", score: 5 },
      { value: "two", label: "Two I can name", score: 4 },
      { value: "one", label: "One I can name", score: 2 },
      { value: "zero", label: "Honestly, zero", score: 0 },
    ],
    helper: "Name them by first name. Vague 'customers would miss us' = you don't actually know who would.",
  },
  {
    id: "q30_competitor_refusal",
    force: "x_factor",
    question_text:
      "Name one specific thing your nearest competitor does that you refuse to do. What's the real reason?",
    input_type: "choice",
    options: [
      {
        value: "nothing_to_name",
        label: "Nothing — I already do everything they do",
        score: 5,
      },
      {
        value: "strategic_choice",
        label: "Refuse for a strategic reason",
        score: 4,
      },
      {
        value: "willingness_admitted",
        label: "Refuse because it's uncomfortable — admit it",
        score: 2,
      },
      {
        value: "dont_know",
        label: "Don't know what competitor does differently",
        score: 1,
      },
    ],
    helper: "Real X-Factor shows in what you refuse. A non-negotiable that costs you deals.",
  },
  {
    id: "q31_imitable_in_30_days",
    force: "x_factor",
    question_text:
      "If a well-funded competitor opened tomorrow, how long before they could copy your X-Factor?",
    input_type: "choice",
    options: [
      { value: "years", label: "Years — it compounds over time", score: 5 },
      { value: "12_months", label: "About 12 months", score: 4 },
      { value: "3_months", label: "About 3 months", score: 2 },
      { value: "30_days", label: "30 days", score: 1 },
      { value: "overnight", label: "Overnight", score: 0 },
    ],
  },
  {
    id: "q32_customer_feels_it",
    force: "x_factor",
    question_text:
      "What does the customer experience because of your X-Factor cost?",
    input_type: "choice",
    options: [
      {
        value: "single_named_moment",
        label: "One specific moment they tell friends about",
        score: 5,
      },
      {
        value: "general_quality",
        label: "Better quality overall, no named moment",
        score: 2,
      },
      {
        value: "internal_only",
        label: "Internal effort — they probably don't experience it",
        score: 1,
      },
      { value: "dont_know", label: "Haven't thought about it", score: 0 },
    ],
  },
  {
    id: "q33_referral_sentence",
    force: "x_factor",
    question_text:
      "Can you write the sentence a happy customer would use to refer you?",
    input_type: "choice",
    options: [
      {
        value: "sharp_sentence",
        label: "Yes — one sharp, specific sentence",
        score: 5,
      },
      {
        value: "general_sentence",
        label: "A general sentence, but nothing sharp",
        score: 2,
      },
      {
        value: "cannot_write",
        label: "Honestly, I couldn't write one",
        score: 0,
      },
    ],
  },
  {
    id: "q34_uncopyable_proof",
    force: "x_factor",
    question_text:
      "How often has a customer chosen you over a CHEAPER alternative?",
    input_type: "band",
    options: [
      { value: "often", label: "Often — it's a normal pattern", score: 5 },
      { value: "monthly", label: "At least monthly", score: 4 },
      { value: "rarely", label: "Rarely", score: 2 },
      { value: "lose_on_price", label: "I usually lose on price", score: 1 },
      {
        value: "dont_know",
        label: "I don't track this",
        score: 0,
        untracked: true,
      },
    ],
  },
  {
    id: "q35_self_rated_xfactor_strength",
    force: "x_factor",
    question_text:
      "On 1-5, how strong is your X-Factor (5 = customers would not switch even at half price)?",
    input_type: "choice",
    options: [
      { value: "1", label: "1 — no real X-Factor", score: 1 },
      { value: "2", label: "2 — weak, customers would switch easily", score: 2 },
      { value: "3", label: "3 — some edge, but not unique", score: 3 },
      {
        value: "4",
        label: "4 — strong, most wouldn't switch at the same price",
        score: 4,
      },
      {
        value: "5",
        label: "5 — customers wouldn't switch even at half price",
        score: 5,
      },
    ],
  },
  {
    id: "q36_excuse_translation",
    force: "x_factor",
    question_text:
      "When you lose a deal, what's your most common explanation to yourself?",
    input_type: "choice",
    options: [
      {
        value: "cost_refused",
        label: "Admit it's something I refused to do",
        score: 5,
      },
      { value: "wrong_fit", label: "Wrong-fit prospect", score: 3 },
      {
        value: "market_competitor",
        label: "Market / competitor / pricing",
        score: 1,
      },
      {
        value: "economy_timing",
        label: "Economy / timing / tough customer",
        score: 0,
      },
    ],
    helper: "When you lose a deal, do you blame the market — or own what you refused?",
  },

  // ─── Force 3: Marketing ──────────────────────────────────
  // (Bootcamp: Day 2, Hour 1 — "The Marketing Lie")

  {
    id: "q37_two_word_position",
    force: "marketing",
    question_text:
      "Can you describe your business in two sharp, specific words?",
    input_type: "choice",
    options: [
      {
        value: "two_words_sharp",
        label:
          "Yes — two sharp words like 'before-7AM', 'eggless-only', or 'JEE-without-burnout'",
        score: 5,
      },
      {
        value: "phrase",
        label: "I have a longer phrase or multiple ideas — not down to two words",
        score: 3,
      },
      {
        value: "slogan_mush",
        label:
          "Vague words like 'quality', 'trusted', 'premium', 'authentic'",
        score: 1,
      },
      { value: "none", label: "Nothing — never written one", score: 0 },
    ],
  },
  {
    id: "q38_customer_one_liner",
    force: "marketing",
    question_text:
      "If asked your last 10 customers what you do in one sentence, would any two say the same thing?",
    input_type: "choice",
    options: [
      {
        value: "all_same",
        label: "Most or all would say the same thing",
        score: 5,
      },
      { value: "most_same", label: "Most would converge", score: 4 },
      { value: "few_same", label: "A few would overlap", score: 2 },
      {
        value: "all_different",
        label: "All would say something different",
        score: 0,
      },
    ],
    helper: "If your last 10 customers describe you 10 different ways, you don't have a message.",
  },
  {
    id: "q39_stack_layer_dominant",
    force: "marketing",
    question_text:
      "Where does most of your marketing money/time/effort actually go right now?",
    input_type: "choice",
    options: [
      {
        value: "layer1_position",
        label: "Layer 1 — deciding what we stand for and what we'll refuse",
        score: 5,
      },
      {
        value: "layer2_message",
        label: "Layer 2 — sharpening website / WhatsApp bio / one-liner",
        score: 4,
      },
      {
        value: "layer3_distribution",
        label: "Layer 3 — ads, reels, agencies, hoardings",
        score: 2,
      },
      { value: "nothing_systematic", label: "Nothing systematic", score: 0 },
    ],
    helper: "Layer 1 = position (what you refuse). Layer 2 = message (the sentence). Layer 3 = distribution (ads, channels).",
  },
  {
    id: "q40_three_sacrifices",
    force: "marketing",
    question_text:
      "Name three specific things you've refused in the last year to defend your position.",
    input_type: "choice",
    options: [
      {
        value: "three_named",
        label: "Yes — I can name three specifically",
        score: 5,
      },
      { value: "one_two", label: "One or two come to mind", score: 3 },
      {
        value: "none_position",
        label: "None — but I'm clear on my position",
        score: 1,
      },
      {
        value: "none_take_all",
        label: "None — I take whatever comes",
        score: 0,
      },
    ],
  },
  {
    id: "q41_marketing_burn_pattern",
    force: "marketing",
    question_text:
      "Roughly how many rupees in the last 12 months produced ZERO traceable customers?",
    input_type: "band",
    unit: "₹",
    options: [
      { value: "lt_50k", label: "Under ₹50,000", score: 5 },
      { value: "50k_2L", label: "₹50,000 – ₹2 lakh", score: 4 },
      { value: "2L_5L", label: "₹2 – 5 lakh", score: 3 },
      { value: "5L_15L", label: "₹5 – 15 lakh", score: 2 },
      { value: "gt_15L", label: "More than ₹15 lakh", score: 1 },
      { value: "stopped_counting", label: "Stopped counting", score: 0 },
      {
        value: "dont_know",
        label: "I don't track this",
        score: 0,
        untracked: true,
      },
    ],
    helper: "Burn rate, not spend rate. Rupees that produced zero traceable customers.",
  },
  {
    id: "q42_pattern_diagnosis",
    force: "marketing",
    question_text: "Which pattern fits you best?",
    input_type: "choice",
    options: [
      {
        value: "none_of_three",
        label: "None — stack intact at all layers",
        score: 5,
      },
      {
        value: "layer3_bleeder",
        label: "Layer-3 Bleeder — ads with no clear position",
        score: 2,
      },
      {
        value: "layer2_mute",
        label: "Layer-2 Mute — real edge but no repeatable sentence",
        score: 2,
      },
      {
        value: "layer1_ghost",
        label: "Layer-1 Ghost — known for nothing",
        score: 1,
      },
    ],
    helper: "Do any of these fit how your marketing actually runs?",
  },
  {
    id: "q43_doorway_picked",
    force: "marketing",
    question_text:
      "Have you picked one positioning doorway and actively defended it?",
    input_type: "choice",
    options: [
      {
        value: "one_picked_defended",
        label: "One picked and actively defended",
        score: 5,
      },
      {
        value: "one_picked_recent",
        label: "One picked recently, still testing",
        score: 4,
      },
      {
        value: "multiple_tried",
        label: "Tried multiple, none stuck",
        score: 2,
      },
      { value: "none_picked", label: "None picked", score: 0 },
    ],
    helper: "Pick ONE lens (e.g. 'morning dads only', 'restaurants under 10 staff') and stay disciplined.",
  },
  {
    id: "q44_wom_diagnosis",
    force: "marketing",
    question_text:
      "Most customers via word of mouth — because they have a sentence to repeat, or because you've never tested anything else?",
    input_type: "choice",
    options: [
      {
        value: "sentence_repeated",
        label: "They have a sharp sentence they repeat about us",
        score: 5,
      },
      {
        value: "general_referral",
        label: "General referrals, no specific sentence",
        score: 3,
      },
      {
        value: "untested",
        label: "Honestly, I've never tested anything else",
        score: 1,
      },
      {
        value: "not_wom",
        label: "Not really word-of-mouth driven",
        score: 1,
      },
    ],
    helper: "Is WOM strong because customers repeat a sharp sentence — or because you never tested a channel?",
  },
  {
    id: "q45_self_rated_position_clarity",
    force: "marketing",
    question_text:
      "On 1-5, how sharply would customers converge on the one word you own?",
    input_type: "choice",
    options: [
      { value: "1", label: "1 — they'd all say something different", score: 1 },
      { value: "2", label: "2 — vague overlap", score: 2 },
      { value: "3", label: "3 — some convergence", score: 3 },
      { value: "4", label: "4 — strong convergence", score: 4 },
      {
        value: "5",
        label: "5 — they'd all land on the same word",
        score: 5,
      },
    ],
  },

  // ─── Force 4: Sales ──────────────────────────────────────
  // (Bootcamp: Day 2, Hour 2 + Hour 3 — Sales Lie + Conversion Lie)

  {
    id: "q46_offer_strength",
    force: "sales",
    question_text: "Rate your offer on 4 levers: dream outcome named, real guarantee, first win in under 14 days, done-for-you.",
    input_type: "choice",
    options: [
      {
        value: "grand_slam",
        label:
          "Dream outcome specific, real guarantee, first-win < 14 days, DFY effort",
        score: 5,
      },
      { value: "three_of_four", label: "Three of four levers sharp", score: 4 },
      { value: "two_of_four", label: "Two of four", score: 2 },
      { value: "feature_list", label: "Feature list with a price", score: 1 },
      {
        value: "same_as_competitor",
        label: "Same offer my 3 competitors run",
        score: 0,
      },
    ],
  },
  {
    id: "q47_xyz_guarantee",
    force: "sales",
    question_text:
      "Do you have a written guarantee like 'If you don't get X within Y, we will Z' — and does Z cost you real rupees?",
    input_type: "choice",
    options: [
      {
        value: "real_z",
        label: "Yes — and the Z costs me real rupees",
        score: 5,
      },
      {
        value: "soft_z",
        label: "Yes — but the Z is soft (no real cost)",
        score: 2,
      },
      { value: "no_guarantee", label: "No guarantee", score: 0 },
    ],
    helper: "Z must be real money out of your account — not a discount or a vague promise.",
  },
  {
    id: "q48_disqualification_practice",
    force: "sales",
    question_text:
      "When did you last tell a prospect 'this isn't for you'?",
    input_type: "choice",
    options: [
      { value: "this_month", label: "This month", score: 5 },
      { value: "last_quarter", label: "In the last quarter", score: 3 },
      { value: "over_year", label: "Over a year ago", score: 1 },
      { value: "never", label: "Never", score: 0 },
    ],
    helper: "Do you actively tell prospects 'this isn't for you'? Or take every lead?",
  },
  {
    id: "q49_investigation_ratio",
    force: "sales",
    question_text:
      "In a typical first sales conversation, what % time do YOU talk vs the prospect?",
    input_type: "choice",
    options: [
      {
        value: "prospect_70",
        label: "Prospect talks ~70%, I listen",
        score: 5,
      },
      { value: "even", label: "Roughly 50/50", score: 3 },
      { value: "i_talk_70", label: "I talk ~70%", score: 1 },
      { value: "i_talk_90", label: "I talk ~90% — it's a pitch", score: 0 },
    ],
    helper: "If you talk more than the prospect, you're pitching, not investigating.",
  },
  {
    id: "q50_implication_questions",
    force: "sales",
    question_text:
      "Do you ask questions that make prospects feel the cost of staying the same?",
    input_type: "choice",
    options: [
      { value: "routine", label: "Routinely — it's part of my flow", score: 5 },
      { value: "sometimes", label: "Sometimes", score: 3 },
      { value: "unfamiliar", label: "I'm not really familiar with these", score: 1 },
      { value: "never", label: "Never", score: 0 },
    ],
  },
  {
    id: "q51_lost_deal_diagnosis",
    force: "sales",
    question_text: "Last deal you lost — where did it break?",
    input_type: "choice",
    options: [
      {
        value: "layer1_offer",
        label: "Layer 1 — weak offer, compared on price",
        score: 5,
      },
      {
        value: "layer2_investigation",
        label: "Layer 2 — I pitched instead of investigated",
        score: 5,
      },
      {
        value: "layer3_panic",
        label: "Layer 3 — panicked at close, dropped price",
        score: 4,
      },
      { value: "prospect_fault", label: "Prospect wasn't serious", score: 1 },
      { value: "havent_thought", label: "Haven't thought about it", score: 0 },
    ],
    helper:
      "Bootcamp's view — if your default diagnosis is 'prospect's fault', that itself is the diagnosis.",
  },
  {
    id: "q52_continuation_count",
    force: "sales",
    question_text:
      "Of last 10 sales conversations, how many ended in a clear next step — either Order, Advance, or Continuation?",
    input_type: "choice",
    options: [
      {
        value: "mostly_advance_order",
        label: "Mostly Orders or Advances",
        score: 5,
      },
      { value: "mixed", label: "Mixed — some Advances, some stalls", score: 3 },
      {
        value: "mostly_continuation",
        label: "Mostly Continuations (think-about-it)",
        score: 1,
      },
      {
        value: "dont_track",
        label: "I don't track this",
        score: 0,
        untracked: true,
      },
    ],
    helper: "Order = they said yes. Advance = next step is booked. Continuation = 'let me think about it' (the slow no).",
  },
  {
    id: "q53_trust_leak",
    force: "sales",
    question_text:
      "Which of these is MOST true about your business right now?",
    input_type: "choice",
    options: [
      { value: "none_clean", label: "None — Layer 0 is clean", score: 5 },
      {
        value: "stock_photo",
        label: "Stock photos / generic visuals",
        score: 2,
      },
      {
        value: "generic_superlative",
        label: "Generic superlatives (best, leading, premier)",
        score: 2,
      },
      {
        value: "do_everything",
        label: "We-do-everything positioning",
        score: 1,
      },
      {
        value: "invisible_founder",
        label: "Invisible founder / no human face",
        score: 1,
      },
      {
        value: "post_sale_ghost",
        label: "Post-sale ghost — disappear after the cheque",
        score: 1,
      },
    ],
    helper: "Layer 0 = what people feel about you BEFORE you say anything. What's leaking trust?",
  },
  {
    id: "q54_self_rated_close_skill",
    force: "sales",
    question_text: "On 1-5, how good are you at closing?",
    input_type: "choice",
    options: [
      { value: "1", label: "1 — I freeze at close", score: 1 },
      { value: "2", label: "2 — uncomfortable, often drop price", score: 2 },
      { value: "3", label: "3 — average, sometimes close", score: 3 },
      { value: "4", label: "4 — strong, hold price", score: 4 },
      { value: "5", label: "5 — closing is automatic, never panic", score: 5 },
    ],
  },

  // ─── Force 5: Financial ──────────────────────────────────
  // (Bootcamp: Day 3, Hour 1 — "The Profit Lie")

  {
    id: "q55_owner_salary",
    force: "financial",
    question_text:
      "What recurring monthly salary do you actually pay yourself (number that hits a personal account on a date)?",
    input_type: "number",
    unit: "₹",
    min_value: 0,
    max_value: 100000000,
    format_hint:
      "Type the rupee amount, no commas. If you don't pay yourself a salary, type 0.",
    confidence_required: true,
    helper: "Honest number, not the wish number.",
  },
  {
    id: "q56_bus_test_wage",
    force: "financial",
    question_text:
      "Monthly salary you'd need to pay someone to do what you do, end-to-end?",
    input_type: "number",
    unit: "₹",
    min_value: 0,
    max_value: 100000000,
    format_hint:
      "Type the market wage for someone who could do what you do, end-to-end. No commas.",
    confidence_required: true,
    helper: "Not what you WANT to pay — what the market would demand. If this matches Q55, one of the numbers isn't honest.",
  },
  {
    id: "q57_corrected_pretax",
    force: "financial",
    question_text:
      "After plugging Bus Test wage in, real pretax margin?",
    input_type: "band",
    unit: "%",
    confidence_required: true,
    options: [
      { value: "gt_20", label: "More than 20%", score: 5 },
      { value: "15_20", label: "15 – 20%", score: 5 },
      { value: "10_15", label: "10 – 15%", score: 4 },
      { value: "5_10", label: "5 – 10%", score: 2 },
      { value: "0_5", label: "0 – 5%", score: 1 },
      { value: "negative", label: "Negative — losing money", score: 0 },
      {
        value: "dont_know",
        label: "I don't track this",
        score: 0,
        untracked: true,
      },
    ],
    helper: "Bus Test margin — revenue minus delivery cost minus what you'd pay to replace yourself.",
  },
  {
    id: "q58_account_separation",
    force: "financial",
    question_text:
      "How many separate bank accounts does your business operate?",
    input_type: "choice",
    options: [
      {
        value: "four_plus",
        label: "Four or more (Profit, Tax, Owner Pay, Opex separated)",
        score: 5,
      },
      { value: "three", label: "Three", score: 4 },
      { value: "two", label: "Two", score: 3 },
      { value: "one", label: "Just one operating account", score: 1 },
    ],
    helper: "Separate accounts force discipline: Profit set-aside, Tax reserve, Owner salary, Operating expenses.",
  },
  {
    id: "q59_profit_allocation",
    force: "financial",
    question_text:
      "On every deposit, what % swept to Profit account BEFORE expenses?",
    input_type: "band",
    unit: "%",
    confidence_required: true,
    options: [
      { value: "gt_10", label: "More than 10%", score: 5 },
      { value: "5_10", label: "5 – 10%", score: 4 },
      { value: "1_5", label: "1 – 5%", score: 3 },
      {
        value: "zero_intend",
        label: "Zero — but I intend to start",
        score: 1,
      },
      { value: "zero", label: "Zero — no sweep at all", score: 0 },
    ],
    helper: "Sweep-first: move profit % out BEFORE expenses, not after. The discipline that protects profit.",
  },
  {
    id: "q60_owner_drawing_predictability",
    force: "financial",
    question_text: "Last 6 months — predictability of your drawings?",
    input_type: "choice",
    options: [
      {
        value: "fixed_salary",
        label: "Fixed salary, same date every month",
        score: 5,
      },
      { value: "mostly_fixed", label: "Mostly fixed, occasional variation", score: 4 },
      {
        value: "whenever_cash",
        label: "I draw whenever there's cash in the business",
        score: 2,
      },
      {
        value: "whenever_personal",
        label: "I draw whenever I personally need money",
        score: 1,
      },
    ],
    helper: "Do you take a fixed salary on a fixed date — or raid the account when you need it?",
  },
  {
    id: "q61_pricing_basis",
    force: "financial",
    question_text: "How was your top-selling price set?",
    input_type: "choice",
    options: [
      {
        value: "corrected_margin",
        label: "From corrected margin math (after Bus Test wage)",
        score: 5,
      },
      { value: "gm_target", label: "From a gross-margin target", score: 3 },
      { value: "competitor", label: "Based on what competitors charge", score: 2 },
      { value: "gut_inherited", label: "Gut feel / inherited", score: 1 },
      { value: "cost_plus", label: "Cost-plus markup", score: 1 },
    ],
    helper: "Price should flow from: what you need to clear, minus delivery cost, minus what you'd pay to replace yourself.",
  },
  {
    id: "q62_avoidance_pattern",
    force: "financial",
    question_text:
      "Last time you sat with last year's real P&L for 30+ minutes?",
    input_type: "choice",
    options: [
      { value: "this_month", label: "This month", score: 5 },
      { value: "this_quarter", label: "This quarter", score: 4 },
      { value: "this_year", label: "This year, once", score: 2 },
      { value: "over_year", label: "Over a year ago", score: 1 },
      {
        value: "never_real_one",
        label: "Never sat with a real one",
        score: 0,
      },
    ],
    helper: "Do you sit with your P&L 30+ minutes a week — or file-and-forget?",
  },
  {
    id: "q63_self_rated_financial_clarity",
    force: "financial",
    question_text: "On 1-5, how clear unaided by your CA?",
    input_type: "choice",
    options: [
      { value: "1", label: "1 — totally dependent on my CA", score: 1 },
      { value: "2", label: "2 — I know the topline, not much else", score: 2 },
      { value: "3", label: "3 — roughly know margins and cash", score: 3 },
      {
        value: "4",
        label: "4 — clear on margins, runway, and unit economics",
        score: 4,
      },
      {
        value: "5",
        label: "5 — crystal, I drive the numbers, CA just files",
        score: 5,
      },
    ],
  },

  // ─── Force 6: Optimisation ───────────────────────────────
  // (Bootcamp: Day 3, Hour 2 — "The Growth Lie", Goldratt half)

  {
    id: "q64_herbie_named",
    force: "optimisation",
    question_text:
      "Can you name ONE specific bottleneck that's pacing everything?",
    input_type: "choice",
    options: [
      {
        value: "process_or_capacity",
        label: "Specific process step or asset capacity",
        score: 5,
      },
      {
        value: "policy_or_belief",
        label: "Specific policy or belief",
        score: 5,
      },
      { value: "owner_me", label: "Me — I'm the bottleneck", score: 2 },
      {
        value: "generic_team_cash",
        label: "Team / cash / leads (a category)",
        score: 1,
      },
      { value: "dont_know", label: "Don't know", score: 0 },
    ],
    helper: "One specific constraint — a process step, asset, or policy. Not a category like 'team' or 'cash'.",
  },
  {
    id: "q65_effort_location",
    force: "optimisation",
    question_text:
      "Of last ₹1 lakh growth spend, what % went directly at your named bottleneck?",
    input_type: "band",
    unit: "%",
    options: [
      { value: "gt_75", label: "More than 75%", score: 5 },
      { value: "50_75", label: "50 – 75%", score: 4 },
      { value: "25_50", label: "25 – 50%", score: 3 },
      { value: "lt_25", label: "Under 25%", score: 1 },
      {
        value: "dont_know",
        label: "I don't track this",
        score: 0,
        untracked: true,
      },
    ],
    helper: "Did your growth money go where the real constraint is? Or scattered elsewhere?",
  },
  {
    id: "q66_exploit_before_elevate",
    force: "optimisation",
    question_text:
      "Exploited constraint (zero new spend) BEFORE elevating (hire/buy)?",
    input_type: "choice",
    options: [
      {
        value: "yes_exploited",
        label: "Yes — squeezed every drop before spending",
        score: 5,
      },
      {
        value: "tried_partial",
        label: "Tried partially before elevating",
        score: 3,
      },
      {
        value: "straight_to_elevate",
        label: "Went straight to hire/buy",
        score: 1,
      },
      { value: "none_either", label: "Did neither systematically", score: 0 },
    ],
    helper: "Exploit = squeeze free gains from current capacity. Only elevate (hire/buy) after exploit runs dry.",
  },
  {
    id: "q67_three_ways_pattern",
    force: "optimisation",
    question_text:
      "Which growth levers have you actively worked in the last 12 months?",
    input_type: "choice",
    options: [
      {
        value: "all_three",
        label: "All three — more clients, bigger sales, more frequency",
        score: 5,
      },
      { value: "two_of_three", label: "Two of three", score: 4 },
      { value: "one_only", label: "Only one", score: 2 },
      {
        value: "way_1_only",
        label: "Only Way 1 (more clients) — chasing leads",
        score: 1,
      },
      { value: "none_systematic", label: "None systematically", score: 0 },
    ],
    helper: "Three levers: acquire more clients, raise deal size per client, deepen repeat sales per client.",
  },
  {
    id: "q68_inertia_policy",
    force: "optimisation",
    question_text:
      "Is there a rule you wrote 3+ years ago that now slows you down?",
    input_type: "choice",
    options: [
      {
        value: "yes_named_acting",
        label: "Yes — I've named it and I'm acting on it",
        score: 5,
      },
      {
        value: "yes_named_stuck",
        label: "Yes — I've named it but haven't changed it",
        score: 3,
      },
      {
        value: "suspect_havent_looked",
        label: "I suspect so, haven't audited",
        score: 1,
      },
      { value: "no_all_current", label: "No — all rules are current", score: 4 },
    ],
    helper: "A rule written 3+ years ago that now slows you down. Name it, then kill or defend it explicitly.",
  },
  {
    id: "q69_value_chain_mapped",
    force: "optimisation",
    question_text:
      "Written down every step a customer's money takes through your business?",
    input_type: "choice",
    options: [
      { value: "yes_recently", label: "Yes — mapped recently", score: 5 },
      { value: "yes_old", label: "Yes — but it's old", score: 3 },
      { value: "in_head", label: "It's in my head, not written", score: 1 },
      { value: "never", label: "Never mapped", score: 0 },
    ],
    helper: "Map every step: lead → onboard → deliver → invoice → cash. No hidden steps.",
  },
  {
    id: "q70_subordinate_discipline",
    force: "optimisation",
    question_text:
      "Keep non-bottleneck resources IDLE when bottleneck can't absorb?",
    input_type: "choice",
    options: [
      {
        value: "yes_disciplined",
        label: "Yes — disciplined about it",
        score: 5,
      },
      {
        value: "try_slip",
        label: "Try to, but we slip into keeping everyone busy",
        score: 3,
      },
      {
        value: "everyone_busy",
        label: "Everyone must look busy — culture is that way",
        score: 1,
      },
      { value: "concept_new", label: "This concept is new to me", score: 0 },
    ],
    helper: "Keeping non-bottleneck resources busy just to look busy = burning cash without output.",
  },
  {
    id: "q71_throughput_metric",
    force: "optimisation",
    question_text:
      "Do you track ONE number weekly that tells you whether the business is moving?",
    input_type: "choice",
    options: [
      {
        value: "single_number",
        label: "Yes — one number I check weekly",
        score: 5,
      },
      {
        value: "several_dashboards",
        label: "Several dashboards, no single number",
        score: 2,
      },
      { value: "monthly_only", label: "Monthly only, not weekly", score: 1 },
      { value: "gut_feel", label: "Gut feel, no number", score: 0 },
    ],
    helper: "Examples: deals closed this week, units shipped, customers onboarded. Pick ONE and check it same day every week.",
  },
  {
    id: "q72_self_rated_bottleneck_clarity",
    force: "optimisation",
    question_text:
      "On 1-5, how sure are you that this bottleneck is the REAL one?",
    input_type: "choice",
    options: [
      { value: "1", label: "1 — guessing", score: 1 },
      { value: "2", label: "2 — a hunch", score: 2 },
      { value: "3", label: "3 — pretty sure", score: 3 },
      { value: "4", label: "4 — confident", score: 4 },
      { value: "5", label: "5 — proven with data", score: 5 },
    ],
  },

  // ─── Force 7: Scale ──────────────────────────────────────
  // (Bootcamp: Day 3, Hour 2 latter + Hour 3)
  // 8 questions (not 9) per design.

  {
    id: "q73_vacation_test",
    force: "scale",
    question_text:
      "Longest you could disappear (no phone, no email, no WhatsApp) before the business breaks?",
    input_type: "choice",
    options: [
      { value: "60_plus", label: "60+ days", score: 5 },
      { value: "30", label: "About 30 days", score: 4 },
      { value: "7_14", label: "7 – 14 days", score: 2 },
      { value: "lt_3", label: "Under 3 days", score: 1 },
    ],
    helper: "Org chart size is not the diagnostic; vacation test is.",
  },
  {
    id: "q74_only_i_can",
    force: "scale",
    question_text: "Complete: 'Only I can ___.'",
    input_type: "choice",
    options: [
      {
        value: "none_truly",
        label: "Nothing truly — others can do everything I do",
        score: 5,
      },
      {
        value: "one_strategic",
        label: "One strategic decision (vision, big bets)",
        score: 4,
      },
      {
        value: "one_relationship",
        label: "One relationship that requires my face",
        score: 3,
      },
      { value: "several", label: "Several things", score: 1 },
      {
        value: "most_things",
        label: "Most things — the business is me",
        score: 0,
      },
    ],
  },
  {
    id: "q75_replacement_ladder_order",
    force: "scale",
    question_text: "Most recent hire?",
    input_type: "choice",
    options: [
      { value: "admin_first", label: "Admin / EA / ops support", score: 5 },
      { value: "delivery_head", label: "Delivery lead / head of ops", score: 4 },
      { value: "marketing_head", label: "Marketing lead / head of growth", score: 3 },
      { value: "sales_rep", label: "Sales rep / BD person", score: 1 },
      { value: "no_hires", label: "No hires", score: 0 },
    ],
    helper: "Martell's order is admin first, sales fourth.",
  },
  {
    id: "q76_buyback_rate_aware",
    force: "scale",
    question_text:
      "Have you calculated what an hour of your time is worth, and delegated tasks worth less than that?",
    input_type: "choice",
    options: [
      {
        value: "yes_delegating",
        label: "Yes — calculated, and actively delegating below it",
        score: 5,
      },
      {
        value: "yes_aware",
        label: "Yes — calculated, aware but not delegating yet",
        score: 3,
      },
      {
        value: "havent_calculated",
        label: "Haven't calculated it",
        score: 2,
      },
      {
        value: "do_everything",
        label: "I do everything regardless of rate",
        score: 1,
      },
    ],
    helper: "Buyback Rate = annual personal cost ÷ 2000 hours. Anything worth less than that per hour, delegate it.",
  },
  {
    id: "q77_warrillow_three_criteria",
    force: "scale",
    question_text:
      "Can your top offering pass these three tests: Teachable, Valuable, and Repeatable?",
    input_type: "choice",
    options: [
      { value: "all_three", label: "All three — yes", score: 5 },
      { value: "two_of_three", label: "Two of three", score: 3 },
      { value: "one_of_three", label: "Only one", score: 2 },
      { value: "none", label: "None — it's bespoke", score: 0 },
    ],
    helper: "Teachable = your team can learn it. Valuable = a buyer pays for it. Repeatable = same outcome every time.",
  },
  {
    id: "q78_founder_as_asset_risk",
    force: "scale",
    question_text:
      "Are your top 3 customers buying the firm name, or your personal name?",
    input_type: "choice",
    options: [
      {
        value: "firm_brand_process",
        label: "The firm — brand and process",
        score: 5,
      },
      { value: "mostly_firm", label: "Mostly the firm, partly me", score: 3 },
      { value: "mostly_my_name", label: "Mostly my name", score: 1 },
      { value: "only_my_name", label: "Only my name — I am the business", score: 0 },
    ],
    helper: "Do top customers buy the firm — or buy you personally? Can you step out without collapse?",
  },
  {
    id: "q79_named_productized_offering",
    force: "scale",
    question_text: "At least ONE named, productized offering?",
    input_type: "choice",
    options: [
      {
        value: "multiple_named",
        label: "Multiple named, productized offerings",
        score: 5,
      },
      { value: "one_named", label: "One named, productized offering", score: 4 },
      {
        value: "loose_packages",
        label: "Loose packages with names",
        score: 2,
      },
      {
        value: "everything_custom",
        label: "Everything is custom-quoted",
        score: 1,
      },
    ],
    helper: "Productized = named offering, fixed scope, repeatable delivery. Not custom-quoted each time.",
  },
  {
    id: "q80_sellable_in_90_days",
    force: "scale",
    question_text:
      "If buyer offered fair cash, you stepped out in 90 days — would the business survive?",
    input_type: "choice",
    options: [
      {
        value: "yes_running",
        label: "Yes — it would keep running cleanly",
        score: 5,
      },
      {
        value: "yes_after_handover",
        label: "Yes — after a structured handover",
        score: 4,
      },
      { value: "partial", label: "Partially — would lose some revenue", score: 2 },
      {
        value: "would_collapse",
        label: "Would collapse — it depends on me",
        score: 0,
      },
    ],
    helper: "Sellability test — if a buyer paid cash and you stepped out in 90 days, would the business survive?",
  },

  // ─── Force 8: Owner Energy ───────────────────────────────
  // (Bootcamp: Day 1, Hour 3 + Day 3, Hour 3)

  {
    id: "q81_whatsapp_denominator",
    force: "owner_energy",
    question_text: "How many WhatsApp groups for work do you belong to?",
    input_type: "band",
    options: [
      { value: "lt_5", label: "Under 5", score: 5 },
      { value: "5_10", label: "5 – 10", score: 4 },
      { value: "10_20", label: "10 – 20", score: 3 },
      { value: "20_40", label: "20 – 40", score: 2 },
      { value: "gt_40", label: "More than 40", score: 1 },
    ],
    helper: "Each group pulls you into reactive mode. That's a tax on time for your most important work.",
  },
  {
    id: "q82_deep_work_hours",
    force: "owner_energy",
    question_text:
      "How many hours per week of distraction-free deep work on your most important activities?",
    input_type: "band",
    unit: "hours",
    options: [
      { value: "gt_15", label: "More than 15 hours", score: 5 },
      { value: "10_15", label: "10 – 15 hours", score: 4 },
      { value: "5_10", label: "5 – 10 hours", score: 3 },
      { value: "1_5", label: "1 – 5 hours", score: 2 },
      { value: "zero", label: "Zero", score: 1 },
    ],
    helper: "Deep work on the Vital Few is the numerator; distractions are the denominator.",
  },
  {
    id: "q83_vital_few_named",
    force: "owner_energy",
    question_text:
      "Name the 2 or 3 activities that actually move the needle this quarter.",
    input_type: "choice",
    options: [
      {
        value: "yes_two_three",
        label: "Yes — I can name 2 or 3 sharply",
        score: 5,
      },
      { value: "mostly_one", label: "I can name one clearly", score: 4 },
      {
        value: "feels_all_important",
        label: "Everything feels important",
        score: 1,
      },
      { value: "havent_thought", label: "Haven't thought about it", score: 0 },
    ],
    helper: "Vital Few = the 2-3 activities that move the needle THIS quarter. Name them, or everything feels equally urgent.",
  },
  {
    id: "q84_last_subtraction",
    force: "owner_energy",
    question_text:
      "Last time you actively SUBTRACTED something significant?",
    input_type: "choice",
    options: [
      { value: "this_week", label: "This week", score: 5 },
      { value: "this_month", label: "This month", score: 4 },
      { value: "this_quarter", label: "This quarter", score: 3 },
      { value: "this_year", label: "This year", score: 2 },
      { value: "cannot_remember", label: "Can't remember", score: 0 },
    ],
  },
  {
    id: "q85_phone_first_thing",
    force: "owner_energy",
    question_text:
      "Within how many minutes of waking do you check WhatsApp, email, or Instagram?",
    input_type: "choice",
    options: [
      { value: "90_plus", label: "90+ minutes after waking", score: 5 },
      { value: "30_90", label: "30 – 90 minutes", score: 4 },
      { value: "5_30", label: "5 – 30 minutes", score: 3 },
      { value: "lt_5", label: "Under 5 minutes — it's the first thing", score: 1 },
    ],
    helper: "Phone first thing = the rest of your day is reactive, not intentional.",
  },
  {
    id: "q86_sleep_predictability",
    force: "owner_energy",
    question_text:
      "In the last 4 weeks, how many nights did you get 7+ hours of uninterrupted sleep?",
    input_type: "choice",
    options: [
      { value: "gt_20", label: "More than 20 nights", score: 5 },
      { value: "15_20", label: "15 – 20 nights", score: 4 },
      { value: "8_14", label: "8 – 14 nights", score: 3 },
      { value: "lt_8", label: "Under 8 nights", score: 1 },
      {
        value: "dont_track",
        label: "I don't track this",
        score: 1,
        untracked: true,
      },
    ],
    helper: "Sleep tells the truth. 7+ uninterrupted hours = the business runs without your 2 AM brain.",
  },
  {
    id: "q87_say_no_practice",
    force: "owner_energy",
    question_text:
      "Of last 10 'small ask' requests, how many declined?",
    input_type: "choice",
    options: [
      { value: "7_plus", label: "7 or more", score: 5 },
      { value: "4_6", label: "4 – 6", score: 4 },
      { value: "1_3", label: "1 – 3", score: 2 },
      { value: "zero", label: "Zero — said yes to all", score: 0 },
    ],
    helper: "Every yes to a small ask is a no to your Vital Few.",
  },
  {
    id: "q88_protected_thinking_time",
    force: "owner_energy",
    question_text:
      "Recurring 90+ min calendared block for THINKING about the business?",
    input_type: "choice",
    options: [
      { value: "weekly", label: "Weekly", score: 5 },
      { value: "monthly", label: "Monthly", score: 3 },
      { value: "occasional", label: "Occasional, not on calendar", score: 1 },
      { value: "never", label: "Never", score: 0 },
    ],
    helper: "Thinking time is the block founders skip most — and pay for most.",
  },
  {
    id: "q89_freedom_subtraction_admission",
    force: "owner_energy",
    question_text:
      "What's stopping you from building the business that lets you live freely?",
    input_type: "choice",
    options: [
      {
        value: "actively_subtracting",
        label: "Nothing — I'm actively subtracting toward it",
        score: 5,
      },
      {
        value: "clarity_no_will",
        label: "Know what to subtract, haven't done it",
        score: 3,
      },
      { value: "lack_clarity", label: "Don't know what to subtract", score: 2 },
      {
        value: "cant_afford",
        label: "Can't afford to subtract — need every yes",
        score: 1,
      },
      {
        value: "dont_want_to",
        label: "Honestly, I want the outcome without the subtraction",
        score: 0,
      },
    ],
    helper: "The real truth: you can't have the outcome without the subtraction. No shortcuts.",
  },

  // ════════════════════════════════════════════════════════════
  // Cross-force / consistency questions (QX1–QX6)
  // ════════════════════════════════════════════════════════════

  // QX1 is SIGNAL-ONLY — every option scores 0 so it doesn't move
  // any force total. It's compared downstream against the lowest-
  // scored force to detect a self-awareness mismatch.
  {
    id: "qx1_first_fix_priority",
    force: "identity",
    question_text:
      "If you could only fix ONE in the next 90 days, which unlocks the most?",
    input_type: "choice",
    options: [
      { value: "identity", label: "Identity — what business I'm actually in", score: 0 },
      { value: "x_factor", label: "X-Factor — the cost I'm willing to pay", score: 0 },
      { value: "marketing", label: "Marketing — position, message, distribution", score: 0 },
      { value: "sales", label: "Sales — offer, investigation, close", score: 0 },
      { value: "financial", label: "Financial — corrected margin, profit allocation", score: 0 },
      { value: "optimisation", label: "Optimisation — the Herbie / bottleneck", score: 0 },
      { value: "scale", label: "Scale — getting out of my own way", score: 0 },
      { value: "owner_energy", label: "Owner Energy — focus, sleep, subtraction", score: 0 },
    ],
    helper:
      "Signal-only question — not scored. Your pick is compared against your weakest force in the report.",
  },
  {
    id: "qx2_painful_money_lever",
    force: "optimisation",
    question_text:
      "Of the 3 ways to grow, which is MOST uncomfortable to attack — and the highest-leverage?",
    input_type: "choice",
    options: [
      {
        value: "way_2_bigger",
        label: "Way 2 — bigger sales per customer (raise price / upsell)",
        score: 5,
      },
      {
        value: "way_3_frequency",
        label: "Way 3 — more frequent transactions (repeat / retention)",
        score: 5,
      },
      {
        value: "way_1_clients",
        label: "Way 1 — more clients (the comfortable default)",
        score: 4,
      },
      {
        value: "comfortable_with_all",
        label: "Comfortable with all three",
        score: 4,
      },
      {
        value: "havent_separated",
        label: "Haven't separated them in my head",
        score: 1,
      },
    ],
    helper: "Way 1 (more clients) is comfortable. Ways 2 & 3 build the moat.",
  },
  {
    id: "qx3_layer0_to_force5",
    force: "financial",
    question_text:
      "Last time a buyer pushed back on price, did your gut tighten because of YOUR finances (not theirs)?",
    input_type: "choice",
    options: [
      {
        value: "no_calm",
        label: "No — I stayed calm, my finances aren't on the line",
        score: 5,
      },
      { value: "slight", label: "Slight tightening", score: 4 },
      {
        value: "dropped_price",
        label: "Yes — and I dropped price to close",
        score: 1,
      },
      {
        value: "havent_had_pushback",
        label: "Haven't had pushback recently",
        score: 3,
      },
    ],
    helper: "If price pushback tightens your gut, your finances are the real bottleneck.",
  },
  {
    id: "qx4_three_identities_recap",
    force: "identity",
    question_text:
      "Look at your answers to Q19, Q20, and Q21. Do they agree?",
    input_type: "choice",
    options: [
      { value: "agree_strongly", label: "Strongly agree — one story", score: 5 },
      { value: "agree_loosely", label: "Loosely agree", score: 3 },
      { value: "fight", label: "They fight each other", score: 1 },
      { value: "cannot_tell", label: "Can't tell", score: 0 },
    ],
    helper: "These three should tell one coherent story. If they fight, one of them isn't honest.",
  },
  {
    id: "qx5_xfactor_position_alignment",
    force: "x_factor",
    question_text:
      "Look at Q28 (X-Factor cost) and Q37 (two-word position). Does position language communicate the cost?",
    input_type: "choice",
    options: [
      {
        value: "aligned",
        label: "Aligned — the position language tells the customer about the cost",
        score: 5,
      },
      { value: "partial", label: "Partially aligned", score: 3 },
      {
        value: "disconnected",
        label: "Disconnected — position doesn't reflect the cost",
        score: 1,
      },
      { value: "neither", label: "Neither is sharp enough to compare", score: 0 },
    ],
    helper: "Your positioning language should broadcast the cost you're willing to pay.",
  },
  {
    id: "qx6_subtraction_consistency",
    force: "owner_energy",
    question_text:
      "Looking at Q23, Q40, and Q84, is your subtraction discipline consistent?",
    input_type: "choice",
    options: [
      {
        value: "all_three",
        label: "Yes — subtracting consistently across all three",
        score: 5,
      },
      { value: "two_of_three", label: "Two of three", score: 3 },
      { value: "one_of_three", label: "Only one of three", score: 2 },
      { value: "none", label: "None — no subtraction discipline", score: 0 },
    ],
    helper: "Subtraction is a pattern, not a one-off.",
  },
]

// ════════════════════════════════════════════════════════════
// Exports
// ════════════════════════════════════════════════════════════

// Full ordered bank: 17 universal + 5 vertical-conditional Q18
// candidates (from the audit) + 77 new long-form questions = 99 total.
export const ASSESSMENT_QUESTIONS: AuditQuestion[] = [
  ...AUDIT_QUESTIONS,
  ...NEW_QUESTIONS,
]

export function getAssessmentQuestionById(
  id: string,
): AuditQuestion | undefined {
  return ASSESSMENT_QUESTIONS.find((q) => q.id === id)
}

export function getAssessmentQuestionsByForce(
  force: ForceKey,
): AuditQuestion[] {
  return ASSESSMENT_QUESTIONS.filter((q) => q.force === force)
}

// Re-export VERTICAL_Q18 so callers of this module can resolve the
// vertical-conditional Q18 without reaching into lib/audit/.
export { VERTICAL_Q18 }

// Re-export getQuestionById from the audit module so existing code
// paths keep resolving the 16+5 universal questions through the
// same lookup helper. Use getAssessmentQuestionById for the full
// long-form bank.
export { getQuestionById }
