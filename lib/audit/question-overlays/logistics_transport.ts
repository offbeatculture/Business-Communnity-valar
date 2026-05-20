import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Logistics / Transport — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const LOGISTICS_TRANSPORT_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text:
      "When you describe your fleet business to a stranger, who is your one ideal shipper in one sentence?",
    helper:
      "Think shipper type (e-com / FMCG / pharma / manufacturer), lane (e.g. Delhi-Bangalore) and load profile (FTL, refrigerated, bulk).",
    option_labels: {
      specific:
        "I can name a shipper type, lane and load profile (e.g. FMCG FTL on Chennai-Hyderabad)",
      type_and_problem:
        "I can name a shipper type and the lane or load I solve for",
      type_only: "I can name a shipper type only (e-com, manufacturer, retail)",
      anyone: "Honestly, I take whatever load comes on the load board",
    },
  },

  q2_xfactor_source: {
    question_text:
      "In your shippers' own words — not yours — why do they pick your trucks over other transporters?",
    helper:
      "On-time delivery? Per-km rate? Truck condition? POD discipline? Quote shippers verbatim, not what you think they value.",
    option_labels: {
      verbatim: "I've asked them and I can quote 3+ shippers verbatim",
      asked_general: "I've asked them and I have a general sense",
      assumed_generic:
        "I haven't asked, but I'm pretty sure it's rate, on-time or relationship",
      unknown: "I haven't asked. I don't really know.",
    },
  },

  q3_top3_concentration: {
    helper:
      "Share of freight revenue from your top 3 shippers in the last 12 months. In logistics, 60-80% from 1-2 shippers is common and dangerous.",
  },

  q4_lead_source: {
    question_text: "Where do most of your new shippers come from today?",
    helper:
      "Load boards like Vahak/Trukky, freight broker referrals, direct shipper relationships, repeat contracts, or RFPs you respond to.",
    option_labels: {
      wom_only: "Broker network and shipper referrals only",
      one_paid: "One channel working (load board, one big broker, or RFPs)",
      multi_channel:
        "Two or three channels working in parallel (load boards + brokers + direct sales)",
      system:
        "A system: direct sales team + load boards + broker network + repeat contracts running together",
      unclear:
        "Inconsistent — loads come, I don't know exactly which channel",
    },
  },

  q5_cpl: {
    question_text:
      "Roughly, what does it cost you to get one new shipper enquiry (an RFQ or rate request)?",
    helper:
      "A lead = a shipper who asked you for a rate quote or sent an RFP. Include sales team time, load board subscriptions, broker commissions for intros.",
    option_labels: {
      lt_100: "Under ₹100 (mostly load board / broker network)",
      "100_500": "₹100 – ₹500",
      "500_2000": "₹500 – ₹2,000",
      "2000_10000": "₹2,000 – ₹10,000 (direct B2B sales effort)",
      gt_10000: "Over ₹10,000 (enterprise RFPs, key account sales)",
      untracked: "I don't track this",
    },
  },

  q6_conversion: {
    question_text:
      "Of every 10 shippers who request a rate quote, roughly how many run a trial load and become paying customers?",
    helper:
      "A serious enquiry = shipper who got your rate and actually moved a trial load with you. Not just price-shoppers comparing quotes.",
  },

  q7_sales_cycle: {
    question_text:
      "From first RFP or rate request to first payment received from a new shipper, how long does it typically take?",
    helper:
      "Includes trial load, contract signing and 45-60 day receivables. In logistics this is usually 30-90 days from RFP to money in bank.",
    option_labels: {
      same_day: "Same day (load board spot load, paid on POD)",
      within_week: "Within a week",
      "1_4_weeks": "1 – 4 weeks",
      "1_3_months": "1 – 3 months (typical RFP → trial → first payment)",
      gt_3_months: "Over 3 months (large enterprise contracts)",
    },
  },

  q8_revenue_lakhs: {
    helper:
      "Total freight billing in the last 12 months. Include all FTL / PTL / contract revenue. 50 = ₹50 lakhs. 250 = ₹2.5 crore.",
  },

  q9_gross_margin: {
    question_text:
      "Of every ₹100 of freight billed, how much is left after the direct cost of running that trip?",
    helper:
      "INCLUDE: diesel, driver salary/bhatta, tolls, tyres, maintenance, insurance per trip. EXCLUDE: office, dispatch team, software, truck EMIs (those are fixed costs). Most fleets sit at 8-20%.",
    option_labels: {
      gt_70: "₹70 – ₹100 left per trip (70%+ margin)",
      "50_70": "₹50 – ₹70 left per trip (50–70% margin)",
      "30_50": "₹30 – ₹50 left per trip (30–50% margin)",
      "15_30": "₹15 – ₹30 left per trip (15–30% margin)",
      lt_15: "Under ₹15 left per trip (under 15% margin) — typical for FTL",
      untracked: "I don't track per-trip margin",
    },
  },

  q10_cash_runway: {
    question_text:
      "If freight billing stopped today, how many months could you cover fixed costs from cash on hand?",
    helper:
      "Fixed = truck EMIs (often biggest), office, dispatch team, insurance. Remember: diesel + driver advance go OUT daily, but shipper pays you 45-60 days later. That gap eats cash.",
  },

  q11_owner_hours: {
    helper:
      "Hours per week you personally spend on shipper calls, dispatch decisions, driver issues, breakdowns, payment chasing. Be honest — include late-night driver calls.",
  },

  q12_headcount: {
    helper:
      "Full-time people on payroll: drivers, dispatch / control tower, accounts, sales, mechanics, you. Exclude contract drivers paid per trip.",
  },

  q13_bottleneck: {
    question_text:
      "If a big shipper suddenly tripled your loads tomorrow, what breaks first?",
    helper:
      "Trucks, drivers, diesel working capital, dispatch capacity, or your time on shipper relationships.",
    option_labels: {
      owner_time: "My time — I personally handle every key shipper",
      team: "My team — not enough drivers or dispatch staff",
      systems:
        "My systems — we'd lose PODs, miss e-way bills, miscalculate trip costs",
      cash: "My cash — I couldn't fund diesel + driver advances upfront",
      supply: "My fleet — I don't have enough trucks to run those loads",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    question_text:
      "On most days, how do you feel walking into the fleet office?",
    helper:
      "Between driver calls, shipper payment chasing, breakdowns and diesel price spikes — what's your real energy level?",
    option_labels: {
      energised: "Energised. I'm building something I love.",
      focused_tired: "Focused but tired. Lots to do, doing it.",
      drained:
        "Drained. Most days are firefighting — breakdowns, driver issues, payment chasing.",
      done: "Done. I'm thinking about selling the trucks or exiting.",
    },
  },

  q15_decision_making: {
    question_text:
      "Who makes the day-to-day decisions — shipper rates, dispatch, driver assignments — in your business?",
    helper:
      "Founder-fleet-owner usually does shipper rates personally; dispatch handles ops. Where are you on that spectrum?",
    option_labels: {
      only_me: "Only me. Every rate, every dispatch decision is mine.",
      me_and_few: "Me and 1–2 trusted people (a dispatch head, an accountant)",
      team_decides:
        "Dispatch team runs ops, I review big shipper deals and rates",
      leadership_layer:
        "I have a leadership layer (ops head, sales head) running the fleet",
    },
  },

  q16_founder_age: {
    helper: "How old are you?",
  },
  q17_marketing_spend: {
    helper:
      'Include load-board subscriptions, B2B sales-team comp, shipper visits and freight-broker partnerships. Mostly relationship-driven — typically 2-6% of revenue.',
  },

  q18_dso_days: {
    helper:
      "From PoD upload to money in bank, across your shippers. E-com aggregator shippers pay 45-60 days; corporate manufacturers can stretch to 90+. Long DSO + daily diesel cash-out = you're a bank that runs trucks.",
  },
}
