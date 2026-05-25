import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Manufacturing / Trading — long-form assessment overlay (Q19-Q89, QX1-QX6).
// Option `value` strings stay identical to the universal questions
// in lib/assessment/questions.ts. Only labels and surrounding copy change.

const MANUFACTURING_ASSESSMENT_OVERLAYS: VerticalQuestionOverlays = {
  // ─── Force 1: Identity ──────────────────────────────────────

  q19_business_naming: {
    question_text:
      "When a buyer asks 'what do you make?', which answer is closest to yours?",
    option_labels: {
      outcome_named:
        "The specific change in the buyer's line (e.g. 'OEMs hit takt time 15% better')",
      category_named:
        "The category (e.g. 'precision machined parts for Tier-1 auto')",
      job_title: "What I do (e.g. 'I run a CNC job shop')",
      spec_sheet:
        "What I make, with specs (e.g. 'stainless fittings, IS-3589, all sizes')",
      receipt: "Who pays (e.g. 'I supply Tier-1 auto / FMCG / pharma')",
      quality_trust:
        "Quality / trust / 'on-time delivery' / 'reliable supplier'",
    },
  },

  q20_disappearance_days: {
    question_text:
      "If you vanished from the factory tomorrow — hospital, holiday, no phone — how many days before dispatches / payments / labor start dropping?",
    helper: "Honest number, not the wish number.",
  },

  q21_best_in_city: {
    question_text:
      "Name the ONE thing your factory could be undisputed best in your city / cluster at.",
    option_labels: {
      specific_narrow:
        "I can name one specific narrow thing (a product spec, a buyer segment, a process)",
      specific_broad: "I can name something but it's still broad",
      vague_slogan:
        "Something like 'quality', 'on-time delivery', 'best price'",
      blank: "Honestly, I can't name one thing",
    },
  },

  q22_three_identities_rhyme: {
    question_text:
      "Do your answers to 'what we make', 'who runs the unit', and 'what we could be best at' tell ONE coherent story?",
    option_labels: {
      rhyme:
        "Yes — they reinforce each other (buyer segment, founder/family, wedge align)",
      partial: "Two of three line up; one is off",
      fight:
        "They contradict — I'm running three different factories inside one shed",
      never_thought: "Never lined them up",
    },
  },

  q23_who_we_serve_subtraction: {
    question_text:
      "In the last 12 months, how many buyer segments or product SKUs have you deliberately STOPPED making for?",
  },

  q24_customer_change_named: {
    question_text:
      "Can your buyer fill: 'Because of you supplying us, our line / business now ____' with one specific change?",
    option_labels: {
      specific_change:
        "Yes — they name a specific line metric or business change",
      outcome_general:
        "They name a general outcome ('good quality material')",
      feature: "They list a spec ('the 4mm thickness')",
      cannot_fill: "They cannot fill it",
    },
  },

  q26_kodak_check: {
    question_text:
      "In the last 3 years, has China, a new domestic competitor, or a substitute material made you re-think what business you're actually in?",
    helper:
      "Think Chinese imports eating margin, OEMs in-housing, EV transition killing your auto-component category, or aluminium replacing steel.",
  },

  q27_inherited_definition: {
    question_text:
      "How was your current factory definition set?",
    option_labels: {
      deliberate_recent:
        "Deliberate, recent — we re-positioned product/buyer mix in the last 12 months",
      deliberate_old: "Deliberate, but set 2+ years ago",
      inherited: "Inherited from father / first big OEM customer",
      default:
        "By default — we made whatever the first big buyer asked for",
    },
  },

  // ─── Force 2: X-Factor ──────────────────────────────────────

  q28_cost_type: {
    question_text:
      "Which of the 3 costs are you actively paying that your nearest competitor (other unit in the cluster) refuses to pay?",
    option_labels: {
      comfort:
        "COMFORT — I do something personally uncomfortable (e.g. founder on the shop floor at 7AM, monthly buyer visits, hard QC rejects) the buyer experiences directly",
      time:
        "TIME — I spend non-scalable time on what the buyer feels (custom QC reports, sample turnarounds, dispatch follow-up)",
      money:
        "MONEY — I spend on something with no clear ROI the buyer sees (over-spec material, better packing, dedicated dispatch vehicle)",
      none_yet: "None of these — yet",
      working_volume:
        "I work harder (more shifts, more SKUs) but the buyer doesn't directly feel it",
    },
  },

  q29_disappearance_suffer: {
    question_text:
      "If you shut the unit tomorrow, how many specific buyers (by purchase head name) would actively SUFFER (line stops, can't switch fast)?",
  },

  q30_competitor_refusal: {
    question_text:
      "Name one specific thing your nearest competitor does that you refuse to do. What's the real reason?",
    option_labels: {
      nothing_to_name:
        "Nothing — we already do everything they do",
      strategic_choice:
        "Refuse for a strategic reason (would kill margin, breaks our buyer mix)",
      willingness_admitted:
        "Refuse because it's uncomfortable (e.g. 90-day credit, custom tooling for small orders, late-night dispatch)",
      dont_know: "Don't actually know what competitors do differently",
    },
  },

  q31_imitable_in_30_days: {
    question_text:
      "If a well-funded competitor opened a unit next door tomorrow, how long before they could copy your X-Factor?",
  },

  q32_customer_feels_it: {
    question_text:
      "What does the buyer experience because of your X-Factor cost?",
    option_labels: {
      single_named_moment:
        "One specific moment (a rush dispatch, a QC save, a custom run) they remember when re-ordering",
      general_quality:
        "Better quality overall, no specific moment they'd name",
      internal_only:
        "Internal shop-floor effort — they probably don't experience it",
      dont_know: "Haven't thought about it",
    },
  },

  q33_referral_sentence: {
    question_text:
      "Can you write the sentence a happy buyer's purchase head would use to refer you to another OEM?",
    option_labels: {
      sharp_sentence:
        "Yes — sharp, specific, mentions outcome (e.g. 'they hit our delivery dates 12 months running, zero PPM rejects')",
      general_sentence: "Yes but generic ('good vendor, reliable')",
      cannot_write: "Honestly, I can't write it",
    },
  },

  q34_uncopyable_proof: {
    question_text:
      "How often has a buyer chosen you over a CHEAPER quote (or stuck with you at PO renewal when a cheaper vendor was approved)?",
  },

  q36_excuse_translation: {
    question_text:
      "When you lose an RFQ / PO, what's your most common explanation to yourself?",
    option_labels: {
      cost_refused:
        "Admit it's something I refused to do (longer credit, custom tooling, lower MOQ)",
      wrong_fit: "Wrong-fit buyer (not really our segment)",
      market_competitor:
        "Market / competitor / pricing — they went with a cheaper unit",
      economy_timing: "Economy / timing / 'OEM put PO on hold'",
    },
  },

  // ─── Force 3: Marketing (B2B sales for mfg) ─────────────────

  q37_two_word_position: {
    question_text:
      "In 'In the category of ___ vendors, we are the ___ one' — can you fill the second blank with TWO WORDS that pass the opposite-test?",
    option_labels: {
      two_words_sharp:
        "Yes — two specific words a competitor could meaningfully claim the opposite of (e.g. 'small-batch', 'export-only', 'zero-PPM', '24-hour-dispatch')",
      phrase: "I have a phrase but it's 3+ words / multiple ideas",
      slogan_mush:
        "Something like 'best quality', 'on-time delivery', 'trusted vendor', 'ISO-certified'",
      none: "Nothing — never written one",
    },
  },

  q38_customer_one_liner: {
    question_text:
      "If you asked your last 10 buyers what your factory does in one sentence, would any two say the same thing?",
  },

  q39_stack_layer_dominant: {
    question_text:
      "Where does most of your B2B sales budget / time / effort actually go?",
    option_labels: {
      layer1_position:
        "Layer 1 — deciding buyer segment, SKU focus, what we'll refuse to make",
      layer2_message:
        "Layer 2 — sharpening catalog, factory deck, sample kit, IndiaMART/Alibaba page",
      layer3_distribution:
        "Layer 3 — trade shows, IndiaMART/Alibaba subscriptions, B2B sales reps, OEM calls",
      nothing_systematic: "Nothing systematic",
    },
  },

  q40_three_sacrifices: {
    question_text:
      "Name three specific things you've refused in the last year (buyer segments, SKUs, order sizes) to defend your position.",
  },

  q41_marketing_burn_pattern: {
    question_text:
      "Roughly how many rupees on B2B sales (IndiaMART / trade shows / sample shipping / sales rep salaries / export agent fees) in the last 12 months produced ZERO traceable POs?",
  },

  q42_pattern_diagnosis: {
    question_text: "Which B2B sales pathology fits you best?",
    option_labels: {
      none_of_three: "None — stack intact at all 3 layers",
      layer3_bleeder:
        "Layer-3 Bleeder — IndiaMART / trade shows / rep spend with no clear position",
      layer2_mute:
        "Layer-2 Mute — real edge but no repeatable factory pitch / one-liner",
      layer1_ghost:
        "Layer-1 Ghost — known for nothing in our cluster / category",
    },
  },

  q43_doorway_picked: {
    question_text:
      "From the 8 positioning doorways (Order Size, Price tier, Buyer Type, Industry Vertical, SKU Niche, Channel, Heavy-Buyer, Against-the-Leader) — picked one?",
  },

  q44_wom_diagnosis: {
    question_text:
      "Most POs via references / buyer pull-through — because they have a sentence to repeat, or because you've never tested anything else?",
    option_labels: {
      sentence_repeated:
        "They have a specific sentence about us they repeat to other buyers",
      general_referral:
        "General 'good vendor, talk to them' references",
      untested:
        "We've never tested IndiaMART / trade shows / outbound seriously",
      not_wom: "We don't actually get many references",
    },
  },

  q45_self_rated_position_clarity: {
    question_text:
      "On 1-5, how sharply would your buyers converge on the one word your factory owns?",
  },

  // ─── Force 4: Sales ─────────────────────────────────────────

  q46_offer_strength: {
    question_text:
      "Score your factory offer using Hormozi's Value Equation.",
    option_labels: {
      grand_slam:
        "Dream outcome named specifically (zero-PPM, on-time-in-full, jobwork flexibility), real guarantee (replacement / penalty / credit), first sample in days, done-for-you (tooling included)",
      three_of_four: "Three of four levers sharp",
      two_of_four: "Two of four",
      feature_list: "Spec sheet + a price per kg/piece",
      same_as_competitor:
        "Same offer my 3 nearest cluster competitors run",
    },
  },

  q47_xyz_guarantee: {
    question_text:
      "Do you have a written X/Y/Z guarantee ('If you don't get X in Y, we Z') with a Z that costs you real rupees (PPM penalty / free replacement / delivery credit)?",
  },

  q48_disqualification_practice: {
    question_text:
      "When did you last tell an enquiring buyer, out loud, 'we're not the right vendor for this RFQ'?",
  },

  q49_investigation_ratio: {
    question_text:
      "In a typical first buyer visit / call, what % of the time do YOU talk vs the buyer / purchase head?",
    option_labels: {
      prospect_70:
        "Buyer talks 70%+ — I'm asking about their line, current vendor pain, volumes",
      even: "Roughly 50/50",
      i_talk_70: "I talk 70% — I'm walking them through our factory and capabilities",
      i_talk_90: "I talk 90% — full factory tour and product pitch",
    },
  },

  q50_implication_questions: {
    question_text:
      "Do you use Implication Questions (stacking the cost of inaction — line down hours, rejection cost, end-customer complaints) before sending the quote?",
  },

  q51_lost_deal_diagnosis: {
    question_text: "Last big RFQ / PO you lost — which layer failed?",
    option_labels: {
      layer1_offer:
        "Layer 1 — weak offer, got compared only on price per piece",
      layer2_investigation:
        "Layer 2 — I quoted spec instead of investigating their line pain",
      layer3_panic:
        "Layer 3 — panicked on procurement negotiation, dropped price / extended credit",
      prospect_fault: "Buyer wasn't serious / went with cheap import",
      havent_thought: "Haven't thought about it",
    },
    helper:
      "If your default diagnosis is 'buyer went cheap', that itself is the diagnosis.",
  },

  q52_continuation_count: {
    question_text:
      "Of last 10 RFQ conversations, how many ended in an actual PO, Advance (sample approved / next round), or Continuation (deal alive with named action)?",
  },

  q53_trust_leak: {
    question_text:
      "Which of the 5 trust leaks is most YOUR factory right now?",
    option_labels: {
      none_clean: "None — IndiaMART, brochure, factory visit are all clean",
      stock_photo:
        "Stock photos / no real factory photos / no buyer logos on the wall",
      generic_superlative:
        "Generic superlatives ('best quality', 'ISO 9001', 'most trusted')",
      do_everything:
        "Pitch 'we make everything' — no SKU focus",
      invisible_founder:
        "Invisible founder — no presence in cluster associations, no LinkedIn",
      post_sale_ghost:
        "Post-PO ghost — service drops after the first dispatch",
    },
  },

  q54_self_rated_close_skill: {
    question_text: "On 1-5, how good are you at closing a buyer (RFQ → PO)?",
  },

  // ─── Force 5: Financial ─────────────────────────────────────

  q55_owner_salary: {
    question_text:
      "Monthly salary you pay yourself as owner (the actual number hitting your personal account on a fixed date)?",
    unit: "₹",
  },

  q56_bus_test_wage: {
    question_text:
      "If hit by a bus tomorrow, monthly salary needed to hire a competent factory GM / MD replacement?",
    unit: "₹",
    helper: "If this matches Q55, one of the numbers isn't honest.",
  },

  q57_corrected_pretax: {
    question_text:
      "After plugging the Bus Test GM wage in (replacing your real owner draw), what's your real pretax margin?",
  },

  q58_account_separation: {
    question_text:
      "How many separate bank accounts does the business operate (Current, Tax, Profit, Working Capital, Payroll, etc.)?",
  },

  q59_profit_allocation: {
    question_text:
      "On every payment received from a buyer, what % is swept to a Profit account BEFORE expenses (raw material, salaries, EMIs)?",
  },

  q60_owner_drawing_predictability: {
    question_text:
      "In the last 6 months, how predictable have your owner drawings been?",
    option_labels: {
      fixed_salary: "Fixed salary, same day each month",
      mostly_fixed: "Mostly fixed, occasionally adjusted",
      whenever_cash:
        "Whenever buyer payments clear / WC loan has room",
      whenever_personal: "Whenever I personally need money",
    },
  },

  q61_pricing_basis: {
    question_text:
      "How was your top-selling product price (per kg / per piece) set?",
    option_labels: {
      corrected_margin:
        "Corrected margin — material + labor + utilities + overhead + capital cost + target margin",
      gm_target:
        "Gross-margin target (we modelled raw material + conversion cost vs price)",
      competitor:
        "Benchmarked competitor pricing (other units in the cluster)",
      gut_inherited:
        "Gut feel / inherited from father / old price list",
      cost_plus: "Cost-plus / material + fixed % markup",
    },
  },

  q62_avoidance_pattern: {
    question_text:
      "Last time you sat with last year's real P&L (with corrected owner wage and depreciation) for 30+ minutes — not just the CA's filing copy?",
  },

  q63_self_rated_financial_clarity: {
    question_text:
      "On 1-5, how clearly do you know your real per-SKU margin, DSO, and inventory days unaided by your CA?",
  },

  // ─── Force 6: Optimisation ──────────────────────────────────

  q64_herbie_named: {
    question_text:
      "Name your factory's Herbie — ONE specific bottleneck pacing everything.",
    option_labels: {
      process_or_capacity:
        "A specific process step or machine (e.g. CNC capacity, heat treatment turnaround, packing line, QC throughput)",
      policy_or_belief:
        "A specific policy or belief (e.g. 'we don't accept POs under 1 ton')",
      owner_me:
        "Me — I'm the bottleneck (every PO, payment, sample approval routes to me)",
      generic_team_cash: "Team / cash / orders (a category, not a specific step)",
      dont_know: "Don't know",
    },
  },

  q65_effort_location: {
    question_text:
      "Of your last ₹1L of growth spend (capex / sales / WC), what % actually landed AT your named Herbie?",
  },

  q66_exploit_before_elevate: {
    question_text:
      "Did you exploit the constraint (zero new spend — better schedules, batch sizes, changeover SOPs) BEFORE elevating (new machine, new shift)?",
  },

  q67_three_ways_pattern: {
    question_text:
      "Of Jay Abraham's 3 Ways (more buyers / bigger PO size / more frequency of POs), which have you actively worked in the last 12 months?",
  },

  q68_inertia_policy: {
    question_text:
      "Is there a 3+ year old rule (vendor list, MOQ, credit policy, shift pattern) that now slows you down?",
  },

  q69_value_chain_mapped: {
    question_text:
      "Written down every step a buyer's money takes through your factory — from RFQ to payment received — in the last 6 months?",
  },

  q70_subordinate_discipline: {
    question_text:
      "Do you keep non-bottleneck resources IDLE when the bottleneck can't absorb (e.g. don't run upstream machines if QC / dispatch is jammed)?",
  },

  q71_throughput_metric: {
    question_text:
      "ONE weekly number that tells you whether factory throughput moved (dispatched value, OEE, on-time-in-full, throughput per shift)?",
    option_labels: {
      single_number: "One single number, looked at weekly",
      several_dashboards:
        "Several dashboards (production, dispatch, rejection, DSO) — no single number",
      monthly_only: "Monthly only — board / closing cadence",
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
      "Longest you could disappear (no shop-floor calls, no buyer WhatsApp) before the factory breaks?",
  },

  q74_only_i_can: {
    question_text:
      "Complete: 'In this factory, only I can ___.'",
    option_labels: {
      none_truly: "Nothing — GM / plant head / accounts head all decide on their own",
      one_strategic:
        "One strategic thing (capex / new buyer / fundraise)",
      one_relationship:
        "One key relationship (a marquee OEM who deals only with me)",
      several: "Several things still route to me",
      most_things:
        "Most things — POs, payments, samples, dispatch, vendor calls",
    },
  },

  q75_replacement_ladder_order: {
    question_text: "Your most recent hire?",
    option_labels: {
      admin_first:
        "Admin / accountant / dispatch coordinator (Martell-correct: admin first)",
      delivery_head:
        "Plant head / production head / GM",
      marketing_head: "Head of B2B sales / business development",
      sales_rep:
        "Field sales rep / IndiaMART manager (Martell says wait — sales is fourth)",
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
      "Apply Warrillow's three criteria to your flagship SKU / product family: Teachable + Valuable + Repeatable?",
  },

  q78_founder_as_asset_risk: {
    question_text:
      "Are your top 3 buyers placing POs with the FIRM (brand / process / GST entity) or YOU (owner relationship — they only deal with you)?",
    option_labels: {
      firm_brand_process:
        "The firm / brand / process — my name isn't load-bearing",
      mostly_firm: "Mostly the firm, my name helps",
      mostly_my_name: "Mostly my name + relationship",
      only_my_name:
        "Only my name — if I exit, they shift the PO to another vendor",
    },
  },

  q79_named_productized_offering: {
    question_text:
      "Do you have at least ONE named, productized SKU / catalog (locked spec + price list) vs everything custom-quote?",
    option_labels: {
      multiple_named:
        "Multiple named SKUs with published price list",
      one_named: "One named SKU, rest is custom RFQ",
      loose_packages:
        "Loose catalog — every PO gets a custom quote",
      everything_custom: "Everything is custom — no productized SKU",
    },
  },

  q80_sellable_in_90_days: {
    question_text:
      "If a strategic buyer / PE offered fair cash and you stepped out in 90 days — would the unit survive?",
  },

  // ─── Force 8: Owner Energy ──────────────────────────────────

  q81_whatsapp_denominator: {
    question_text:
      "How many WhatsApp groups do you keep open for work — shop floor, buyers, vendors, transporters, cluster association?",
  },

  q82_deep_work_hours: {
    question_text:
      "Hours per week of distraction-free deep work on your Vital Few (capex strategy, big buyer relationships, GM hiring, new SKU launch)?",
  },

  q83_vital_few_named: {
    question_text:
      "Can you name the 2 or 3 activities that actually move dispatched-value this quarter?",
  },

  q84_last_subtraction: {
    question_text:
      "Last time you actively SUBTRACTED something significant (dropped a buyer, killed an SKU, shut a shift, exited a market)?",
  },

  q85_phone_first_thing: {
    question_text:
      "Within how many minutes of waking do you check WhatsApp / buyer messages / shop-floor calls?",
  },

  q88_protected_thinking_time: {
    question_text:
      "Do you have a recurring 90+ min calendar block for THINKING about the factory (strategy, not firefighting)?",
  },

  q89_freedom_subtraction_admission: {
    question_text:
      "What's stopping you from building the factory that lets you live freely?",
    option_labels: {
      actively_subtracting:
        "Nothing — I'm actively subtracting (fewer SKUs, fewer buyers, fewer firefighting calls)",
      clarity_no_will:
        "I know what to subtract (buyers, SKUs, shifts) — haven't done it",
      lack_clarity: "I don't know what to subtract",
      cant_afford:
        "Can't afford to subtract — need every PO to cover EMIs and payroll",
      dont_want_to:
        "Honestly, I want the topline / cluster status without the subtraction",
    },
  },

  // ─── Cross-force consistency ────────────────────────────────

  qx2_painful_money_lever: {
    question_text:
      "Of the 3 Ways to grow (more buyers / bigger PO size / more frequency-repeat-POs), which is MOST uncomfortable to attack — and the highest-leverage one?",
    option_labels: {
      way_2_bigger:
        "Way 2 — bigger PO size (move upmarket buyer, raise per-piece price)",
      way_3_frequency:
        "Way 3 — more frequency (longer contracts, more SKUs per buyer, repeat POs)",
      way_1_clients: "Way 1 — more buyers (top of B2B sales funnel)",
      comfortable_with_all: "Comfortable with all three",
      havent_separated: "Haven't separated them",
    },
  },

  qx3_layer0_to_force5: {
    question_text:
      "Last buyer pushed back hard on price / credit terms — did your gut tighten because of YOUR cash position / WC loan (not theirs)?",
  },
}

export default MANUFACTURING_ASSESSMENT_OVERLAYS
