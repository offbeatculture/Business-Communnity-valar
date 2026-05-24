import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Agency / Consulting / Services — long-form assessment overlay (Q19-Q89, QX1-QX6).
// Option `value` strings stay identical to the universal questions
// in lib/assessment/questions.ts. Only labels and surrounding copy change.

const AGENCY_SERVICES_ASSESSMENT_OVERLAYS: VerticalQuestionOverlays = {
  // ─── Force 1: Identity ──────────────────────────────────────

  q19_business_naming: {
    question_text:
      "When a prospect asks 'what does your agency do?', which answer is closest to yours?",
    option_labels: {
      outcome_named:
        "The specific change in the client's business (e.g. 'we cut SaaS founders' CAC by 30% in 90 days')",
      category_named:
        "The category (e.g. 'performance marketing for D2C brands')",
      job_title: "My functional label (e.g. 'I run a digital agency')",
      spec_sheet:
        "What we deliver, with services (e.g. 'SEO, content, ads, web design')",
      receipt:
        "Who pays (e.g. 'I work with B2B SaaS founders / D2C brands')",
      quality_trust:
        "Quality / trust / 'senior attention' / 'partner mindset'",
    },
  },

  q20_disappearance_days: {
    question_text:
      "If you vanished from the agency tomorrow — hospital, holiday, no Slack — how many days before retainers / pipeline / delivery start dropping?",
    helper: "Honest number, not the wish number.",
  },

  q21_best_in_city: {
    question_text:
      "Name the ONE thing your agency could be undisputed best in your city / niche at.",
    option_labels: {
      specific_narrow:
        "I can name one specific narrow thing (a verticalised service)",
      specific_broad: "I can name something but it's still broad",
      vague_slogan:
        "Something like 'creative excellence', 'senior attention', 'partner mindset'",
      blank: "Honestly, I can't name one thing",
    },
  },

  q22_three_identities_rhyme: {
    question_text:
      "Do your answers to 'what does the agency do', 'who runs it', and 'what we could be best at' tell ONE coherent story?",
    option_labels: {
      rhyme: "Yes — they reinforce each other (ICP, founder, wedge align)",
      partial: "Two of three line up; one is off",
      fight:
        "They contradict — I'm running three different agencies inside one",
      never_thought: "Never lined them up",
    },
  },

  q23_who_we_serve_subtraction: {
    question_text:
      "In the last 12 months, how many client types or service lines have you deliberately STOPPED taking on?",
  },

  q24_customer_change_named: {
    question_text:
      "Can your client fill: 'Because of your agency, our business now ____' with one specific change?",
    option_labels: {
      specific_change:
        "Yes — they name a specific metric or business change",
      outcome_general: "They name a general outcome ('better marketing')",
      feature: "They list a deliverable ('the website', 'the reels')",
      cannot_fill: "They cannot fill it",
    },
  },

  q26_kodak_check: {
    question_text:
      "In the last 3 years, has AI, in-housing, or a new agency format made you re-think what business you're actually in?",
    helper:
      "Think AI-generated creative eating production agencies, brands in-housing performance, or productized services / fractional models eating retainers.",
  },

  q27_inherited_definition: {
    question_text:
      "How was your current agency definition set?",
    option_labels: {
      deliberate_recent:
        "Deliberate, recent — we re-positioned in the last 12 months",
      deliberate_old: "Deliberate, but set 2+ years ago",
      inherited:
        "Inherited from the first big client we landed",
      default:
        "By default — we kept saying yes to whatever scope came our way",
    },
  },

  // ─── Force 2: X-Factor ──────────────────────────────────────

  q28_cost_type: {
    question_text:
      "Which of the 3 costs are you actively paying that your nearest competitor refuses to pay?",
    option_labels: {
      comfort:
        "COMFORT — I do something personally uncomfortable (e.g. firing wrong-fit clients, hard reviews, fixed-scope SOWs) the client experiences directly",
      time:
        "TIME — I spend non-scalable founder/AD time the client feels (weekly strategy, war-room hours)",
      money:
        "MONEY — I spend on something with no clear ROI the client sees (senior talent on every account, deep research)",
      none_yet: "None of these — yet",
      working_volume:
        "I work harder (more deliverables, faster turnarounds) but the client doesn't directly feel it",
    },
  },

  q29_disappearance_suffer: {
    question_text:
      "If you shut the agency tomorrow, how many specific clients (by first name) would actively SUFFER (not just be inconvenienced)?",
  },

  q30_competitor_refusal: {
    question_text:
      "Name one specific thing your nearest agency competitor does that you refuse to do. What's the real reason?",
    option_labels: {
      nothing_to_name:
        "Nothing — we already do everything they do",
      strategic_choice:
        "Refuse for a strategic reason (would dilute focus, kill margin)",
      willingness_admitted:
        "Refuse because it's uncomfortable / hard (e.g. monthly reporting decks, late-night client WhatsApp)",
      dont_know:
        "Don't actually know what competitors do differently",
    },
  },

  q31_imitable_in_30_days: {
    question_text:
      "If a well-funded agency competitor opened tomorrow with a bigger team, how long before they could copy your X-Factor?",
  },

  q32_customer_feels_it: {
    question_text:
      "What does the client experience because of your X-Factor cost?",
    option_labels: {
      single_named_moment:
        "One specific moment (a strategy call, a save, a launch) they tell peer founders about",
      general_quality:
        "Better quality overall, no specific moment they'd name",
      internal_only:
        "Internal team effort — they probably don't experience it",
      dont_know: "Haven't thought about it",
    },
  },

  q33_referral_sentence: {
    question_text:
      "Can you write the sentence a happy client would use to refer your agency to a peer founder?",
    option_labels: {
      sharp_sentence:
        "Yes — sharp, specific, mentions outcome (e.g. 'they 3x'd our pipeline in 90 days')",
      general_sentence: "Yes but generic ('great team, great work')",
      cannot_write: "Honestly, I can't write it",
    },
  },

  q34_uncopyable_proof: {
    question_text:
      "How often has a client chosen you over a CHEAPER agency (or stayed at renewal when a cheaper option pitched them)?",
  },

  q36_excuse_translation: {
    question_text:
      "When you lose a pitch / retainer, what's your most common explanation to yourself?",
    option_labels: {
      cost_refused:
        "Admit it's something I refused to do (no all-in-one scope, no media buying, no in-house team)",
      wrong_fit: "Wrong-fit prospect (not really ICP)",
      market_competitor:
        "Market / competitor / pricing — they went with a cheaper agency",
      economy_timing: "Economy / timing / 'marketing budget cut'",
    },
  },

  // ─── Force 3: Marketing (biz-dev for agencies) ──────────────

  q37_two_word_position: {
    question_text:
      "In 'In the category of ___ agencies, we are the ___ one' — can you fill the second blank with TWO WORDS that pass the opposite-test?",
    option_labels: {
      two_words_sharp:
        "Yes — two specific words a competitor could meaningfully claim the opposite of (e.g. 'fractional-CMO', 'SaaS-only', 'no-retainer')",
      phrase: "I have a phrase but it's 3+ words / multiple ideas",
      slogan_mush:
        "Something like 'full-service', 'creative-led', 'data-driven', 'partner mindset'",
      none: "Nothing — never written one",
    },
  },

  q38_customer_one_liner: {
    question_text:
      "If you asked your last 10 clients what your agency does in one sentence, would any two say the same thing?",
  },

  q39_stack_layer_dominant: {
    question_text:
      "Where does most of your biz-dev budget / time / effort actually go?",
    option_labels: {
      layer1_position:
        "Layer 1 — deciding ICP, niche, what we'll refuse to take",
      layer2_message:
        "Layer 2 — sharpening website, case studies, decks, founder LinkedIn",
      layer3_distribution:
        "Layer 3 — paid ads, outbound, agency directories, conferences",
      nothing_systematic: "Nothing systematic",
    },
  },

  q40_three_sacrifices: {
    question_text:
      "Name three specific things you've refused in the last year (verticals, retainer sizes, service lines) to defend your agency position.",
  },

  q41_marketing_burn_pattern: {
    question_text:
      "Roughly how many rupees on biz-dev (paid ads + LinkedIn time + agency directories + conferences + outbound) in the last 12 months produced ZERO traceable retainers?",
  },

  q42_pattern_diagnosis: {
    question_text:
      "Which biz-dev pathology fits you best?",
    option_labels: {
      none_of_three: "None — stack intact at all 3 layers",
      layer3_bleeder:
        "Layer-3 Bleeder — running ads / directories / outbound with no clear position",
      layer2_mute:
        "Layer-2 Mute — real edge but no repeatable one-liner / case study",
      layer1_ghost:
        "Layer-1 Ghost — known for nothing in our category",
    },
  },

  q43_doorway_picked: {
    question_text:
      "From the 8 positioning doorways (Client Size, Price tier, Buyer Role, Industry Vertical, Service Mode, Channel, Heavy-User, Against-the-Leader) — picked one?",
  },

  q44_wom_diagnosis: {
    question_text:
      "Most retainers via word of mouth / founder referrals — because they have a sentence to repeat, or because you've never tested anything else?",
    option_labels: {
      sentence_repeated:
        "They have a specific sentence about us they repeat",
      general_referral:
        "General 'good agency, hire them' referrals",
      untested:
        "We've never tested paid biz-dev / outbound / content seriously",
      not_wom: "We don't actually get many referrals",
    },
  },

  q45_self_rated_position_clarity: {
    question_text:
      "On 1-5, how sharply would your clients converge on the one word your agency owns?",
  },

  // ─── Force 4: Sales ─────────────────────────────────────────

  q46_offer_strength: {
    question_text:
      "Score your agency offer using Hormozi's Value Equation.",
    option_labels: {
      grand_slam:
        "Dream outcome named specifically (in client's metric), real guarantee (refund / KPI-tied), first-win < 14 days, done-for-you",
      three_of_four: "Three of four levers sharp",
      two_of_four: "Two of four",
      feature_list: "Scope of work + a retainer price",
      same_as_competitor:
        "Same offer my 3 nearest agency competitors run",
    },
  },

  q47_xyz_guarantee: {
    question_text:
      "Do you have a written X/Y/Z guarantee ('If you don't get X in Y, we Z') with a Z that costs you real rupees (refund, free months, fee-at-risk)?",
  },

  q48_disqualification_practice: {
    question_text:
      "When did you last tell a prospect on a discovery call, out loud, 'we're not the right agency for you'?",
  },

  q49_investigation_ratio: {
    question_text:
      "In a typical first discovery call, what % of the time do YOU talk vs the prospect?",
    option_labels: {
      prospect_70:
        "Prospect talks 70%+ — I'm running discovery questions (SPIN / pain)",
      even: "Roughly 50/50",
      i_talk_70: "I talk 70% — I'm walking through our credentials deck",
      i_talk_90: "I talk 90% — full agency pitch",
    },
  },

  q50_implication_questions: {
    question_text:
      "Do you use Implication Questions (stacking the cost of inaction — lost revenue, slipped quarter, competitor gain) before sending the proposal?",
  },

  q51_lost_deal_diagnosis: {
    question_text:
      "Last retainer / project you lost — which layer failed?",
    option_labels: {
      layer1_offer:
        "Layer 1 — weak offer, compared on hourly rate / scope size",
      layer2_investigation:
        "Layer 2 — I pitched our work instead of investigating their pain",
      layer3_panic:
        "Layer 3 — panicked at procurement, dropped retainer / added free scope",
      prospect_fault:
        "Prospect wasn't serious / wrong-fit",
      havent_thought: "Haven't thought about it",
    },
    helper:
      "If your default diagnosis is 'prospect's fault', that itself is the diagnosis.",
  },

  q52_continuation_count: {
    question_text:
      "Of last 10 sales conversations, how many ended in a clear Signed SOW, Advance (next step booked), or Continuation (deal alive with named action)?",
  },

  q53_trust_leak: {
    question_text:
      "Which of the 5 trust leaks is most YOUR agency right now?",
    option_labels: {
      none_clean: "None — site, case studies, and pitch are clean",
      stock_photo:
        "Stock photos / fake testimonials / vague case studies (no logos, no numbers)",
      generic_superlative:
        "Generic superlatives ('award-winning', 'world-class', 'creative-led')",
      do_everything:
        "Pitch 'we do everything' (full-service, end-to-end)",
      invisible_founder:
        "Invisible founder — no public POV / LinkedIn / talks",
      post_sale_ghost:
        "Post-sale ghost — onboarding drops after the SOW is signed",
    },
  },

  q54_self_rated_close_skill: {
    question_text: "On 1-5, how good are you at closing an agency deal?",
  },

  // ─── Force 5: Financial ─────────────────────────────────────

  q55_owner_salary: {
    question_text:
      "Monthly salary you pay yourself as founder (the actual number hitting your personal account on a fixed date)?",
    unit: "₹",
  },

  q56_bus_test_wage: {
    question_text:
      "If hit by a bus tomorrow, monthly salary needed to hire a competent agency CEO / MD replacement?",
    unit: "₹",
    helper: "If this matches Q55, one of the numbers isn't honest.",
  },

  q57_corrected_pretax: {
    question_text:
      "After plugging the Bus Test CEO wage in (replacing your real founder draw), what's your real pretax margin?",
  },

  q58_account_separation: {
    question_text:
      "How many separate bank accounts does the agency operate (Operating, Tax, Profit, Payroll, etc.)?",
  },

  q59_profit_allocation: {
    question_text:
      "On every retainer / project payment received, what % is swept to a Profit account BEFORE expenses?",
  },

  q60_owner_drawing_predictability: {
    question_text:
      "In the last 6 months, how predictable have your founder drawings been?",
    option_labels: {
      fixed_salary: "Fixed salary, same day each month",
      mostly_fixed: "Mostly fixed, occasionally adjusted",
      whenever_cash:
        "Whenever the agency has cash (after big retainer hits)",
      whenever_personal: "Whenever I personally need money",
    },
  },

  q61_pricing_basis: {
    question_text:
      "How was your top-selling retainer / SOW price set?",
    option_labels: {
      corrected_margin:
        "Corrected margin — fully loaded team cost + target margin + value-based premium",
      gm_target:
        "Gross-margin target (we modelled blended team cost vs retainer)",
      competitor:
        "Benchmarked competitor pricing (other agencies' retainers)",
      gut_inherited: "Gut feel / inherited from our first client",
      cost_plus: "Cost-plus / hourly rate × estimated hours",
    },
  },

  q62_avoidance_pattern: {
    question_text:
      "Last time you sat with last year's real P&L (with corrected founder wage) for 30+ minutes?",
  },

  q63_self_rated_financial_clarity: {
    question_text:
      "On 1-5, how clearly do you know your real per-client margin / utilization / effective hourly without asking your CA?",
  },

  // ─── Force 6: Optimisation ──────────────────────────────────

  q64_herbie_named: {
    question_text:
      "Name your agency's Herbie — ONE specific bottleneck pacing everything.",
    option_labels: {
      process_or_capacity:
        "A specific process step or asset (e.g. senior strategist hours, AD bandwidth, design throughput)",
      policy_or_belief:
        "A specific policy or belief (e.g. 'we don't do fixed-scope projects')",
      owner_me:
        "Me — I'm the bottleneck (every pitch, big call, approval)",
      generic_team_cash: "Team / cash / leads (a category, not a specific step)",
      dont_know: "Don't know",
    },
  },

  q65_effort_location: {
    question_text:
      "Of your last ₹1L of growth spend (biz-dev + tools + hires), what % actually landed AT your named Herbie?",
  },

  q66_exploit_before_elevate: {
    question_text:
      "Did you exploit the constraint (zero new spend — better SOWs, processes, kickoffs) BEFORE elevating (new senior hires, paid tools)?",
  },

  q67_three_ways_pattern: {
    question_text:
      "Of Jay Abraham's 3 Ways (more clients / bigger retainer / more frequency-renewal), which have you actively worked in the last 12 months?",
  },

  q68_inertia_policy: {
    question_text:
      "Is there a 3+ year old rule (scope template, kickoff process, role on every account) that now slows you down?",
  },

  q69_value_chain_mapped: {
    question_text:
      "Written down every step a client's money takes through your agency — from first call to renewal — in the last 6 months?",
  },

  q70_subordinate_discipline: {
    question_text:
      "Do you keep non-bottleneck resources IDLE when the bottleneck can't absorb (e.g. pause biz-dev if delivery senior capacity is maxed)?",
  },

  q71_throughput_metric: {
    question_text:
      "ONE weekly number that tells you whether agency throughput moved (net new MRR retainers, billed hours, AD utilization)?",
    option_labels: {
      single_number: "One single number, looked at weekly",
      several_dashboards:
        "Several dashboards (revenue, utilization, NPS) — no single number",
      monthly_only: "Monthly only — P&L cadence",
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
      "Longest you could disappear (no Slack, no email, no calls) before the agency breaks?",
  },

  q74_only_i_can: {
    question_text:
      "Complete: 'In this agency, only I can ___.'",
    option_labels: {
      none_truly:
        "Nothing — every function has a real owner who decides",
      one_strategic:
        "One strategic thing (final positioning / category POV / fundraise)",
      one_relationship:
        "One key relationship (a marquee client who insists on me)",
      several: "Several things still route to me",
      most_things:
        "Most things — pitches, AD calls on top accounts, hiring, escalations",
    },
  },

  q75_replacement_ladder_order: {
    question_text: "Your most recent hire?",
    option_labels: {
      admin_first:
        "Admin / EA / operations support (Martell-correct: admin first)",
      delivery_head: "Delivery head / Head of Account Management",
      marketing_head: "Head of Marketing / Biz Dev",
      sales_rep: "Junior AE / BDR (Martell says wait — sales is fourth)",
      no_hires: "No hires recently",
    },
    helper: "Martell's order is admin first, sales fourth.",
  },

  q76_buyback_rate_aware: {
    question_text:
      "Have you calculated your Buyback Rate (annual personal cost ÷ 8000 ÷ 4) and do you delegate any task below that rate?",
  },

  q77_warrillow_three_criteria: {
    question_text:
      "Apply Warrillow's three criteria to your flagship retainer / productized service: Teachable + Valuable + Repeatable?",
  },

  q78_founder_as_asset_risk: {
    question_text:
      "Are your top 3 clients buying the AGENCY (brand / process / team) or YOU (founder relationship)?",
    option_labels: {
      firm_brand_process:
        "The agency brand / process — my name isn't load-bearing",
      mostly_firm: "Mostly the agency, my name helps",
      mostly_my_name: "Mostly my name + relationship",
      only_my_name: "Only my name — if I leave, they fire us",
    },
  },

  q79_named_productized_offering: {
    question_text:
      "Do you have at least ONE named, productized offering (e.g. 'Launch Sprint', 'Growth OS', 'Pipeline Engine' with locked scope and price)?",
    option_labels: {
      multiple_named:
        "Multiple named offerings with locked scope and pricing",
      one_named: "One named offering, rest is custom SOW",
      loose_packages:
        "Loose packages — every retainer gets a custom scope",
      everything_custom: "Everything is custom — no productized offering",
    },
  },

  q80_sellable_in_90_days: {
    question_text:
      "If a holding co / strategic buyer offered fair cash and you stepped out in 90 days — would the agency survive?",
  },

  // ─── Force 8: Owner Energy ──────────────────────────────────

  q81_whatsapp_denominator: {
    question_text:
      "How many WhatsApp groups + Slack channels + client groups do you keep open for work (not family)?",
  },

  q82_deep_work_hours: {
    question_text:
      "Hours per week of distraction-free deep work on your Vital Few (positioning, senior client strategy, hiring, founder content)?",
  },

  q83_vital_few_named: {
    question_text:
      "Can you name the 2 or 3 activities that actually move retainer revenue this quarter?",
  },

  q84_last_subtraction: {
    question_text:
      "Last time you actively SUBTRACTED something significant (fired a wrong-fit client, killed a service line, sunsetted a deliverable)?",
  },

  q85_phone_first_thing: {
    question_text:
      "Within how many minutes of waking do you check WhatsApp / Slack / client emails?",
  },

  q88_protected_thinking_time: {
    question_text:
      "Do you have a recurring 90+ min calendar block for THINKING about the agency (strategy, not execution)?",
  },

  q89_freedom_subtraction_admission: {
    question_text:
      "What's stopping you from building the agency that lets you live freely?",
    option_labels: {
      actively_subtracting:
        "Nothing — I'm actively subtracting (fewer service lines, fewer ICPs, fewer client meetings)",
      clarity_no_will:
        "I know what to subtract (clients, scope, hires) — haven't done it",
      lack_clarity: "I don't know what to subtract",
      cant_afford:
        "Can't afford to subtract — need every retainer to make payroll",
      dont_want_to:
        "Honestly, I want the income without the subtraction",
    },
  },

  // ─── Cross-force consistency ────────────────────────────────

  qx2_painful_money_lever: {
    question_text:
      "Of the 3 Ways to grow (more clients / bigger retainer / more frequency-renewal), which is MOST uncomfortable to attack — and the highest-leverage one?",
    option_labels: {
      way_2_bigger:
        "Way 2 — bigger retainer (move upmarket, raise rates)",
      way_3_frequency:
        "Way 3 — more frequency (upsells, longer renewals, expansion scope)",
      way_1_clients: "Way 1 — more clients (top of biz-dev funnel)",
      comfortable_with_all: "Comfortable with all three",
      havent_separated: "Haven't separated them",
    },
  },

  qx3_layer0_to_force5: {
    question_text:
      "Last client pushed back on retainer rate — did your gut tighten because of YOUR cash position (not theirs)?",
  },
}

export default AGENCY_SERVICES_ASSESSMENT_OVERLAYS
