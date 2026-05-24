import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// SaaS / B2B Software — long-form assessment overlay (Q19-Q89, QX1-QX6).
// Option `value` strings stay identical to the universal questions
// in lib/assessment/questions.ts. Only labels and surrounding copy change.

const SAAS_B2B_ASSESSMENT_OVERLAYS: VerticalQuestionOverlays = {
  // ─── Force 1: Identity ──────────────────────────────────────

  q19_business_naming: {
    question_text:
      "When a prospect asks 'what does your product do?', which answer is closest to yours?",
    option_labels: {
      outcome_named:
        "The specific change in the buyer's metric (e.g. 'CFOs close books 3 days faster')",
      category_named:
        "The category I serve (e.g. 'CRM for distribution companies')",
      job_title: "My functional label (e.g. 'I make accounting software')",
      spec_sheet:
        "What it does, with features (e.g. 'multi-tenant invoicing with GST')",
      receipt: "Who buys (e.g. 'I sell to mid-market manufacturers')",
      quality_trust: "Quality / trust / enterprise-grade / customer success",
    },
  },

  q20_disappearance_days: {
    question_text:
      "If you vanished from your SaaS tomorrow — hospital, holiday, no Slack — how many days before MRR / pipeline / renewals start dropping?",
    helper: "Honest number, not the wish number.",
  },

  q21_best_in_city: {
    question_text:
      "Name the ONE thing your product could be undisputed best at in your category.",
    option_labels: {
      specific_narrow:
        "I can name one specific narrow thing (a verticalised use-case)",
      specific_broad: "I can name something but it's still broad",
      vague_slogan:
        "Something like 'best UX' or 'enterprise-grade' or 'easiest to use'",
      blank: "Honestly, I can't name one thing",
    },
  },

  q22_three_identities_rhyme: {
    question_text:
      "Do your answers to 'what does the product do', 'who runs the company', and 'what we could be best at' tell ONE coherent story?",
    option_labels: {
      rhyme: "Yes — they reinforce each other (ICP, founder, wedge align)",
      partial: "Two of three line up; one is off",
      fight: "They contradict — I'm running three different SaaS inside one",
      never_thought: "Never lined them up",
    },
  },

  q23_who_we_serve_subtraction: {
    question_text:
      "In the last 12 months, how many customer segments, verticals, or use-cases have you deliberately STOPPED supporting?",
  },

  q24_customer_change_named: {
    question_text:
      "Can your customer fill: 'Because of your product, I now ____' with one specific metric or behaviour change?",
    option_labels: {
      specific_change:
        "Yes — they name a specific metric or behaviour change",
      outcome_general: "They name a general outcome ('saves time')",
      feature: "They list a feature ('the dashboard')",
      cannot_fill: "They cannot fill it",
    },
  },

  q26_kodak_check: {
    question_text:
      "In the last 3 years, has a new competitor, AI shift, or PLG-native rival made you re-think what business you're actually in?",
    helper:
      "Think GPT wrapping your category, a vertical SaaS eating your horizontal play, or a free open-source alternative gaining traction.",
  },

  q27_inherited_definition: {
    question_text:
      "How was your current product definition set?",
    option_labels: {
      deliberate_recent:
        "Deliberate, recent — we re-positioned in the last 12 months",
      deliberate_old: "Deliberate, but set 2+ years ago",
      inherited: "Inherited from the original wedge / first customer",
      default: "By default — we built whatever customers asked for",
    },
  },

  // ─── Force 2: X-Factor ──────────────────────────────────────

  q28_cost_type: {
    question_text:
      "Which of the 3 costs are you actively paying that your nearest competitor refuses to pay?",
    option_labels: {
      comfort:
        "COMFORT — I do something personally uncomfortable (e.g. founder-led onboarding for every account) the customer experiences directly",
      time: "TIME — I spend non-scalable time the customer feels (e.g. weekly check-ins, custom onboarding)",
      money:
        "MONEY — I spend on something with no clear ROI the customer sees (e.g. white-glove migration team, embedded CSM)",
      none_yet: "None of these — yet",
      working_volume:
        "I work harder (more features shipped) but the customer doesn't directly feel it",
    },
  },

  q29_disappearance_suffer: {
    question_text:
      "If you shut down tomorrow, how many specific customer champions (by first name) would actively SUFFER (not just be annoyed)?",
  },

  q30_competitor_refusal: {
    question_text:
      "Name one specific thing your nearest competitor does that you refuse to do. What's the real reason?",
    option_labels: {
      nothing_to_name:
        "Nothing — we already match every feature/practice they have",
      strategic_choice:
        "Refuse for a strategic reason (would dilute ICP, kill margin)",
      willingness_admitted:
        "Refuse because it's uncomfortable / hard to do at scale — admit it",
      dont_know:
        "Don't actually know what the competitor does differently",
    },
  },

  q31_imitable_in_30_days: {
    question_text:
      "If a well-funded competitor launched tomorrow with twice the engineering team, how long before they could copy your X-Factor?",
  },

  q32_customer_feels_it: {
    question_text:
      "What does the customer experience because of your X-Factor cost?",
    option_labels: {
      single_named_moment:
        "One specific moment (an onboarding win, a CSM save, a feature ship) they tell peers about",
      general_quality:
        "Better quality overall, no specific moment they'd name",
      internal_only:
        "Internal engineering effort — they probably don't experience it",
      dont_know: "Haven't thought about it",
    },
  },

  q33_referral_sentence: {
    question_text:
      "Can you write the sentence a happy champion would use to refer your product to a peer?",
    option_labels: {
      sharp_sentence:
        "Yes — sharp, specific, mentions outcome (e.g. 'cut our payroll close from 5 days to 1')",
      general_sentence: "Yes but generic ('great product, good team')",
      cannot_write: "Honestly, I can't write it",
    },
  },

  q34_uncopyable_proof: {
    question_text:
      "How often has a customer chosen you over a CHEAPER alternative (or stayed at renewal when a cheaper option was on the table)?",
  },

  q36_excuse_translation: {
    question_text:
      "When you lose a deal, what's your most common explanation to yourself?",
    option_labels: {
      cost_refused:
        "Admit it's something I refused to do (no on-prem, no custom dev, no SOC2)",
      wrong_fit: "Wrong-fit prospect (not really ICP)",
      market_competitor:
        "Market / competitor / pricing — they went with a cheaper tool",
      economy_timing: "Economy / timing / 'budget freeze'",
    },
  },

  // ─── Force 3: Marketing ─────────────────────────────────────

  q37_two_word_position: {
    question_text:
      "In 'In the category of ___, we are the ___ one' — can you fill the second blank with TWO WORDS that pass the opposite-test?",
    option_labels: {
      two_words_sharp:
        "Yes — two specific words a competitor could meaningfully claim the opposite of (e.g. 'API-first', 'self-serve-only', 'India-stack-native')",
      phrase: "I have a phrase but it's 3+ words / multiple ideas",
      slogan_mush:
        "Something like 'enterprise-grade', 'AI-powered', 'best-in-class'",
      none: "Nothing — never written one",
    },
  },

  q38_customer_one_liner: {
    question_text:
      "If you asked your last 10 customers what your product does in one sentence, would any two say the same thing?",
  },

  q39_stack_layer_dominant: {
    question_text:
      "Where does most of your marketing budget / team / effort actually go right now?",
    option_labels: {
      layer1_position:
        "Layer 1 — deciding ICP, wedge, what we'll refuse to build",
      layer2_message:
        "Layer 2 — sharpening website / landing pages / one-liner / demos",
      layer3_distribution:
        "Layer 3 — paid ads, SDR outbound, content/SEO, conferences",
      nothing_systematic: "Nothing systematic",
    },
  },

  q40_three_sacrifices: {
    question_text:
      "Name three specific things you've refused in the last year (verticals, features, integrations, deal sizes) to defend your position.",
  },

  q41_marketing_burn_pattern: {
    question_text:
      "Roughly how many rupees on demand-gen (paid + content + outbound + events) in the last 12 months produced ZERO traceable pipeline?",
  },

  q42_pattern_diagnosis: {
    question_text: "Which marketing pathology fits you best?",
    option_labels: {
      none_of_three: "None — stack intact at all 3 layers",
      layer3_bleeder:
        "Layer-3 Bleeder — paid ads / SDR spend with no clear position",
      layer2_mute:
        "Layer-2 Mute — real product edge but no repeatable one-liner",
      layer1_ghost: "Layer-1 Ghost — known for nothing in the category",
    },
  },

  q43_doorway_picked: {
    question_text:
      "From the 8 positioning doorways (Company Size, Price tier, Buyer Role, Industry Vertical, Use-case, Channel, Heavy-User, Against-the-Leader) — picked one?",
  },

  q44_wom_diagnosis: {
    question_text:
      "Most accounts via word of mouth / champion-led — because they have a sentence to repeat, or because you've never tested anything else?",
    option_labels: {
      sentence_repeated:
        "They have a specific sentence about us they repeat",
      general_referral:
        "General 'good tool, good team' referrals",
      untested:
        "We've never tested paid / outbound / content seriously",
      not_wom: "We don't actually get much word of mouth",
    },
  },

  q45_self_rated_position_clarity: {
    question_text:
      "On 1-5, how sharply would your customers converge on the one word your product owns?",
  },

  // ─── Force 4: Sales ─────────────────────────────────────────

  q46_offer_strength: {
    question_text:
      "Score your offer using Hormozi's Value Equation.",
    option_labels: {
      grand_slam:
        "Dream outcome named specifically, real guarantee (refund / SLA / activation guarantee), first-value < 14 days, done-for-you onboarding",
      three_of_four: "Three of four levers sharp",
      two_of_four: "Two of four",
      feature_list: "Feature list + a price",
      same_as_competitor:
        "Same offer my 3 nearest competitors run",
    },
  },

  q47_xyz_guarantee: {
    question_text:
      "Do you have a written X/Y/Z guarantee ('If you don't get X in Y, we Z') with a Z that costs you real rupees (refund, free months, SLA credit)?",
  },

  q48_disqualification_practice: {
    question_text:
      "When did you last tell a prospect on a discovery call, out loud, 'this product isn't for you'?",
  },

  q49_investigation_ratio: {
    question_text:
      "In a typical first discovery call, what % of the time do YOU talk vs the prospect?",
    option_labels: {
      prospect_70: "Prospect talks 70%+ — I'm asking SPIN-style questions",
      even: "Roughly 50/50",
      i_talk_70: "I talk 70% — I'm running through a demo / pitch deck",
      i_talk_90: "I talk 90% — I'm walking through every feature",
    },
  },

  q50_implication_questions: {
    question_text:
      "Do you use Implication Questions (stacking the cost of inaction in your prospect's own words) before showing the demo?",
  },

  q51_lost_deal_diagnosis: {
    question_text: "Last deal you lost — which layer failed?",
    option_labels: {
      layer1_offer:
        "Layer 1 — weak offer, got compared on price / feature parity",
      layer2_investigation:
        "Layer 2 — I demoed instead of investigated their pain",
      layer3_panic:
        "Layer 3 — panicked on procurement, dropped price / added scope",
      prospect_fault: "Prospect wasn't serious / not really ICP",
      havent_thought: "Haven't thought about it",
    },
    helper:
      "If your default diagnosis is 'prospect's fault', that itself is the diagnosis.",
  },

  q52_continuation_count: {
    question_text:
      "Of last 10 sales conversations, how many ended in a clear Order, Advance (next step booked), or Continuation (deal alive with named action)?",
  },

  q53_trust_leak: {
    question_text:
      "Which of the 5 trust leaks is most YOUR product right now?",
    option_labels: {
      none_clean: "None — site, demos, and onboarding are clean",
      stock_photo:
        "Stock photos / fake testimonials / no real logos on the site",
      generic_superlative:
        "Generic superlatives ('best-in-class', 'world-class')",
      do_everything:
        "Pitch 'we do everything' — no clear wedge",
      invisible_founder:
        "Invisible founder — no public POV on LinkedIn / blog",
      post_sale_ghost: "Post-sale ghost — onboarding falls off after CC charge",
    },
  },

  q54_self_rated_close_skill: {
    question_text: "On 1-5, how good are you at closing a SaaS deal?",
  },

  // ─── Force 5: Financial ─────────────────────────────────────

  q55_owner_salary: {
    question_text:
      "Monthly salary you pay yourself as founder/CEO (the actual number that hits your personal account on a fixed date)?",
    unit: "₹",
  },

  q56_bus_test_wage: {
    question_text:
      "If you were hit by a bus tomorrow, what monthly salary would you need to pay to hire a competent CEO replacement?",
    unit: "₹",
    helper: "If this matches Q55, one of the numbers isn't honest.",
  },

  q57_corrected_pretax: {
    question_text:
      "After plugging the Bus Test CEO wage in (replacing your real founder draw), what's your real pretax margin?",
  },

  q58_account_separation: {
    question_text:
      "How many separate bank accounts does the company operate (Operating, Tax, Profit, Payroll, etc.)?",
  },

  q59_profit_allocation: {
    question_text:
      "On every payment received (subscription, deposit, invoice), what % is swept to a Profit account BEFORE expenses?",
  },

  q60_owner_drawing_predictability: {
    question_text:
      "In the last 6 months, how predictable have your founder drawings been?",
    option_labels: {
      fixed_salary: "Fixed salary, same day each month",
      mostly_fixed: "Mostly fixed, occasionally adjusted",
      whenever_cash: "Whenever the company has cash",
      whenever_personal: "Whenever I personally need money",
    },
  },

  q61_pricing_basis: {
    question_text:
      "How was your top-selling plan / tier price set?",
    option_labels: {
      corrected_margin:
        "Corrected margin model — value-based, tied to ROI / seats / usage",
      gm_target: "Gross-margin target (we modelled CAC, LTV, payback)",
      competitor: "Benchmarked competitor pricing (HubSpot / Pipedrive / etc.)",
      gut_inherited: "Gut feel / inherited from MVP days",
      cost_plus: "Cost-plus / 'a few dollars per seat'",
    },
  },

  q62_avoidance_pattern: {
    question_text:
      "Last time you sat with last year's real P&L (with corrected CEO wage) for 30+ minutes?",
  },

  q63_self_rated_financial_clarity: {
    question_text:
      "On 1-5, how clearly do you know your real unit economics (CAC, LTV, payback, gross margin) without asking your CA / FP&A?",
  },

  // ─── Force 6: Optimisation ──────────────────────────────────

  q64_herbie_named: {
    question_text:
      "Name your business's Herbie — ONE specific bottleneck pacing everything.",
    option_labels: {
      process_or_capacity:
        "A specific process step or asset capacity (e.g. AE ramp, onboarding throughput, eng velocity for enterprise asks)",
      policy_or_belief:
        "A specific policy or belief (e.g. 'we don't do annual contracts')",
      owner_me: "Me — I'm the bottleneck (every demo / approval / hire)",
      generic_team_cash: "Team / cash / leads (a category, not a specific step)",
      dont_know: "Don't know",
    },
  },

  q65_effort_location: {
    question_text:
      "Of your last ₹1L of growth spend, what % actually landed AT your named Herbie?",
  },

  q66_exploit_before_elevate: {
    question_text:
      "Did you exploit the constraint (zero new spend — better playbooks, scripts, sequences) BEFORE elevating (new AE hires, paid tooling)?",
  },

  q67_three_ways_pattern: {
    question_text:
      "Of Jay Abraham's 3 Ways (more customers / bigger deal size / more frequency), which have you actively worked in the last 12 months?",
  },

  q68_inertia_policy: {
    question_text:
      "Is there a 3+ year old rule (pricing, ICP, sales process, hiring) that now slows you down?",
  },

  q69_value_chain_mapped: {
    question_text:
      "Written down every step a customer's money takes through your funnel — from first touch to renewal — in the last 6 months?",
  },

  q70_subordinate_discipline: {
    question_text:
      "Do you keep non-bottleneck resources IDLE when the bottleneck can't absorb (e.g. pause SDR spend if onboarding is at capacity)?",
  },

  q71_throughput_metric: {
    question_text:
      "ONE weekly number that tells you whether system throughput moved (net new MRR, qualified pipeline, activated accounts)?",
    option_labels: {
      single_number: "One single number, looked at weekly",
      several_dashboards:
        "Several dashboards (MRR, CAC, churn, NPS) — no single number",
      monthly_only: "Monthly only — board / investor update cadence",
      gut_feel: "Gut feel — 'we had a good week'",
    },
  },

  q72_self_rated_bottleneck_clarity: {
    question_text:
      "On 1-5, how sure are you that your named Herbie is the REAL bottleneck (not a symptom)?",
  },

  // ─── Force 7: Scale ─────────────────────────────────────────

  q73_vacation_test: {
    question_text:
      "Longest you could disappear (no Slack, no email, no calls) before the SaaS breaks?",
  },

  q74_only_i_can: {
    question_text:
      "Complete: 'In this SaaS, only I can ___.'",
    option_labels: {
      none_truly: "Nothing — every function has a real owner who decides",
      one_strategic:
        "One strategic thing (final hire / fundraise / category narrative)",
      one_relationship: "One key relationship (a marquee design partner)",
      several: "Several things still route to me",
      most_things: "Most things — sales, hiring, eng calls, support escalations",
    },
  },

  q75_replacement_ladder_order: {
    question_text: "Your most recent hire?",
    option_labels: {
      admin_first:
        "Admin / EA / operations support (Martell-correct: admin first)",
      delivery_head: "Head of Customer Success / VP Engineering",
      marketing_head: "Head of Marketing / Demand Gen",
      sales_rep: "AE / SDR (Martell says wait — sales is fourth)",
      no_hires: "No hires recently",
    },
    helper: "Martell's order is admin first, sales fourth.",
  },

  q76_buyback_rate_aware: {
    question_text:
      "Have you calculated your Buyback Rate (your annual personal cost ÷ 8000 ÷ 4) and do you delegate any task below that rate?",
  },

  q77_warrillow_three_criteria: {
    question_text:
      "Apply Warrillow's three criteria to your flagship product offering: Teachable + Valuable + Repeatable?",
  },

  q78_founder_as_asset_risk: {
    question_text:
      "Are your top 3 accounts buying the FIRM (brand / process / category) or YOU (founder relationship / champion of you personally)?",
    option_labels: {
      firm_brand_process: "The product / brand / process — my name isn't load-bearing",
      mostly_firm: "Mostly the firm, my name helps",
      mostly_my_name: "Mostly my name + relationship",
      only_my_name: "Only my name — if I leave, they churn",
    },
  },

  q79_named_productized_offering: {
    question_text:
      "Do you have at least ONE named, productized offering (e.g. 'Starter / Growth / Enterprise' with locked scope) vs everything custom?",
    option_labels: {
      multiple_named: "Multiple named SKUs with locked scope and pricing",
      one_named: "One named SKU, rest is custom",
      loose_packages: "Loose packages — every deal gets a custom quote",
      everything_custom: "Everything is custom — no productized SKU",
    },
  },

  q80_sellable_in_90_days: {
    question_text:
      "If a strategic buyer offered fair cash and you stepped out in 90 days — would the SaaS survive?",
  },

  // ─── Force 8: Owner Energy ──────────────────────────────────

  q81_whatsapp_denominator: {
    question_text:
      "How many Slack channels + WhatsApp groups + Discord servers do you keep open for work (not family)?",
  },

  q82_deep_work_hours: {
    question_text:
      "Hours per week of distraction-free deep work on your Vital Few (product strategy, hiring, fundraise, category POV)?",
  },

  q83_vital_few_named: {
    question_text:
      "Can you name the 2 or 3 activities that actually move ARR this quarter?",
  },

  q84_last_subtraction: {
    question_text:
      "Last time you actively SUBTRACTED something significant (killed a feature, sunsetted a SKU, fired a wrong-fit account)?",
  },

  q85_phone_first_thing: {
    question_text:
      "Within how many minutes of waking do you check Slack / email / LinkedIn?",
  },

  q88_protected_thinking_time: {
    question_text:
      "Do you have a recurring 90+ min calendar block for THINKING about the company (strategy, not execution)?",
  },

  q89_freedom_subtraction_admission: {
    question_text:
      "What's stopping you from building the SaaS that lets you live freely?",
    option_labels: {
      actively_subtracting:
        "Nothing — I'm actively subtracting (fewer SKUs, fewer ICPs, fewer meetings)",
      clarity_no_will:
        "I know what to subtract (ICPs, features, hires) — haven't done it",
      lack_clarity: "I don't know what to subtract",
      cant_afford:
        "Can't afford to subtract — need every paid seat to hit plan",
      dont_want_to:
        "Honestly, I want the unicorn outcome without the subtraction",
    },
  },

  // ─── Cross-force consistency ────────────────────────────────

  qx2_painful_money_lever: {
    question_text:
      "Of the 3 Ways to grow (more accounts / bigger ACV / more frequency / expansion), which is MOST uncomfortable to attack — and the highest-leverage one?",
    option_labels: {
      way_2_bigger: "Way 2 — bigger ACV (move upmarket, raise prices)",
      way_3_frequency:
        "Way 3 — more frequency (expansion, multi-product, NRR)",
      way_1_clients: "Way 1 — more accounts (top of funnel)",
      comfortable_with_all: "Comfortable with all three",
      havent_separated: "Haven't separated them",
    },
  },

  qx3_layer0_to_force5: {
    question_text:
      "Last enterprise prospect pushed back on price — did your gut tighten because of YOUR runway (not their procurement)?",
  },
}

export default SAAS_B2B_ASSESSMENT_OVERLAYS
