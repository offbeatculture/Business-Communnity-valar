import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Retail (offline) — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const RETAIL_OFFLINE_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text:
      "When you describe your store to a stranger, who is your one ideal catchment customer in one sentence?",
    helper:
      "Catchment customer = locality + age + occasion + average bill + frequency. Example: 'women 25-40 from 2km, festive ethnic, ₹3,000 ticket, 4x a year.'",
    option_labels: {
      specific:
        "I can name locality, age, occasion, average bill and frequency",
      type_and_problem:
        "I can name the customer type and the occasion they come for",
      type_only:
        "I can name a customer type only (age or locality)",
      anyone: "Honestly, whoever walks in",
    },
  },

  q2_xfactor_source: {
    question_text:
      "In your customers' own words — not yours — why do they pick your store over the shop two lanes away?",
    helper:
      "Have you actually asked repeat customers at the counter? Quoting them ('your bhaji is fresher', 'staff knows my size') counts. Your own guess doesn't.",
    option_labels: {
      verbatim: "I've asked them and can quote 3+ regulars verbatim",
      asked_general: "I've asked at the counter and have a general sense",
      assumed_generic:
        "I haven't asked, but it's probably price, location or service",
      unknown: "I haven't asked. I don't really know.",
    },
  },

  q3_top3_concentration: {
    helper:
      "Pure walk-in retail has low concentration. Use top-3 SKU/category share instead, or top-3 corporate/bulk accounts if you do bulk. 60%+ from 3 SKUs is fragile.",
  },

  q4_lead_source: {
    question_text:
      "Where do most of your walk-ins come from today?",
    helper:
      "Think about how a new buyer first found you: passing by, Google Maps, a hoarding, a WhatsApp broadcast, a referral, or a local FB/Insta post.",
    option_labels: {
      wom_only: "Word of mouth, referrals and passing footfall only",
      one_paid:
        "One paid channel working (Google Maps ads, local FB/Insta, hoardings)",
      multi_channel:
        "Two or three channels working in parallel (maps + social + WhatsApp)",
      system:
        "A system: hoardings + Maps + social + WhatsApp broadcasts + referrals together",
      unclear: "Inconsistent — footfall comes, I don't know exactly how",
    },
  },

  q5_cpl: {
    question_text:
      "Roughly, what does it cost you to bring one new customer through the door?",
    helper:
      "Total local marketing spend in a month (hoardings, leaflets, Maps ads, social) divided by new buyers that month. Most retailers don't track this — pick 'I don't track' if so.",
    option_labels: {
      lt_100: "Under ₹100 per new customer",
      "100_500": "₹100 – ₹500 per new customer",
      "500_2000": "₹500 – ₹2,000 per new customer",
      "2000_10000": "₹2,000 – ₹10,000 per new customer",
      gt_10000: "Over ₹10,000 per new customer",
      untracked: "I don't track this",
    },
  },

  q6_conversion: {
    question_text:
      "Of every 10 walk-ins who actually engage with staff or stock, roughly how many leave with a bill?",
    helper:
      "Walk-in to buyer conversion. Healthy is 30-70% depending on category (FMCG/grocery higher, apparel/electronics lower). Count only people who engaged, not pure browsers.",
  },

  q7_sales_cycle: {
    question_text:
      "From the moment a customer engages with staff or stock to money in the till, how long does a typical sale take?",
    helper:
      "Walk-in retail is usually same-day (minutes). If you have corporate/bulk or made-to-order, that cycle is 1-7 days. Pick whichever is your bread and butter.",
  },

  q8_revenue_lakhs: {
    helper:
      "Top-line billing across all counters in the last 12 months, before COGS. 50 = ₹50 lakhs, 250 = ₹2.5 crore. Include GST-billed and cash.",
  },

  q9_gross_margin: {
    question_text:
      "Of every ₹100 billed, how much is left after the cost of goods sold?",
    helper:
      "COGS = supplier price + shrinkage + home-delivery cost. EXCLUDE rent, staff salaries, electricity, POS software, marketing — those are fixed OpEx. Apparel 50%+, FMCG 15-25%, electronics 8-15%.",
  },

  q10_cash_runway: {
    helper:
      "Fixed costs = rent (often biggest), store staff salaries, electricity, POS/tooling, interest on inventory loans, GST advance. Cash on hand ÷ monthly fixed = months.",
  },

  q11_owner_hours: {
    helper:
      "Be honest. Include time on the shop floor, supplier visits, billing after closing, stock-take on Sundays and WhatsApp orders at night.",
  },

  q12_headcount: {
    helper:
      "Full-time only — counter staff, store manager, delivery boys on payroll, accountant if in-house. Exclude part-time festival hires and the CA on retainer.",
  },

  q13_bottleneck: {
    question_text:
      "If footfall suddenly tripled tomorrow, what breaks first?",
    helper:
      "Think Diwali-rush scenario: billing queue, stock-outs on top SKUs, manager unable to manage staff, no working capital to restock, supplier MOQ delays.",
    option_labels: {
      owner_time: "My time — I'm on the floor billing and managing every hour",
      team: "My team — counter and floor staff can't handle the volume",
      systems:
        "My systems — billing queues, stock-outs, missed home deliveries",
      cash:
        "My cash — I can't fund the inventory restock or extra staff",
      supply:
        "My supply — supplier MOQ and lead times can't keep up",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    helper:
      "Most retail owners are on the shop floor 10+ hours, 6-7 days. Think about how you feel when you raise the shutter in the morning.",
  },

  q15_decision_making: {
    question_text:
      "Who makes the day-to-day calls — pricing, discounts, restocking, staff issues?",
    helper:
      "Retail is usually owner-operator on the floor. Be honest about whether your store manager actually decides, or just executes what you said.",
    option_labels: {
      only_me: "Only me. Nothing moves without me on the floor.",
      me_and_few: "Me and 1-2 trusted staff (store manager, senior counter)",
      team_decides:
        "Store manager runs day-to-day, I review weekly numbers",
      leadership_layer:
        "Multi-store leadership layer runs operations, I work on the business",
    },
  },

  q16_founder_age: {
    helper: "Your age in years. Used for life-stage context, not scoring.",
  },
  q17_marketing_spend: {
    helper:
      'Include hoardings, local FB groups, Google Maps/Justdial, WhatsApp broadcasts and festival promos. Most catchment retailers run 2-6% — catchment-dependent, not paid-traffic dependent.',
  },

  q18_repeat_rate: {
    helper:
      'Of customers who bought in the last 12 months, what % was repeat? Track via loyalty program or POS phone-number lookup. Strong catchment retail crosses 40% repeat.',
  },
}
