import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Restaurant / F&B — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const RESTAURANT_FNB_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text: "When you describe your restaurant to a stranger, who is your one ideal regular in one sentence?",
    helper: "Think occasion plus price point — e.g. 'office lunch crowd, ₹250 ticket' or 'date-night couples, ₹1,500 for two'.",
    option_labels: {
      specific: "I can name the occasion, crowd, and average ticket size",
      type_and_problem: "I can name the crowd and the occasion they come for",
      type_only: "I can name a crowd only (families, office-goers, students)",
      anyone: "Honestly, anyone who walks in or orders online",
    },
  },

  q2_xfactor_source: {
    question_text: "In your guests' own words — not yours — why do they pick you over the restaurant next door?",
    helper: "Reviews on Zomato/Google count only if you've actually read them. Verbatim means you can quote three regulars or repeat customers.",
    option_labels: {
      verbatim: "I've asked regulars and can quote 3+ verbatim",
      asked_general: "I've read reviews and asked a few — general sense",
      assumed_generic: "I haven't asked, but it's the food / ambience / location",
      unknown: "I haven't asked. I don't really know.",
    },
  },

  q3_top3_concentration: {
    question_text: "What percentage of your monthly revenue comes from your single biggest channel (Zomato, Swiggy, or dine-in)?",
    helper: "For restaurants, channel concentration matters more than customer concentration. If Zomato + Swiggy together are 60%+, you're aggregator-dependent.",
  },

  q4_lead_source: {
    question_text: "Where do most of your covers come from today — walk-in, aggregator, or social?",
    helper: "A 'cover' is one diner. Count where the footfall or order originates: hoarding, Instagram, Zomato listing, regulars, corporate tie-ups.",
    option_labels: {
      wom_only: "Walk-in regulars and word-of-mouth only",
      one_paid: "One paid channel working (Zomato Gold, Swiggy, Instagram ads)",
      multi_channel: "Two or three channels working in parallel",
      system: "A system: aggregators + social + regulars + corporate all running",
      unclear: "Inconsistent — guests come, I don't know exactly how",
    },
  },

  q5_cpl: {
    question_text: "Roughly, what does it cost you to get one new first-time guest or order?",
    helper: "Divide last month's Zomato Gold/Pro fees + Instagram ads + hoarding spend by new first-time guests. Most restaurants don't track this.",
    option_labels: {
      lt_100: "Under ₹100 per new guest",
      "100_500": "₹100 – ₹500 per new guest",
      "500_2000": "₹500 – ₹2,000 per new guest",
      "2000_10000": "₹2,000 – ₹10,000 per new guest",
      gt_10000: "Over ₹10,000 per new guest",
      untracked: "I don't track this",
    },
  },

  q6_conversion: {
    question_text: "Of every 10 serious enquiries (walk-ins, table bookings, Zomato Gold taps), how many actually order?",
    helper: "Walk-ins almost always convert (95%+). Table bookings and corporate enquiries are lower. Count the ones that end in a bill.",
  },

  q7_sales_cycle: {
    question_text: "From a guest's first interest (walk-in, booking, enquiry) to the bill being paid, how long does it take?",
    helper: "Walk-in to bill = under an hour. Table booking = 0–7 days. Corporate / event enquiry = 1–30 days. Pick the typical case.",
  },

  q8_revenue_lakhs: {
    helper: "Total billed sales over the last 12 months across dine-in, Zomato, Swiggy, and any catering or corporate orders.",
  },

  q9_gross_margin: {
    question_text: "Of every ₹100 of revenue, how much is left after raw food cost, packaging, and aggregator commission?",
    helper: "Food cost only: raw ingredients + delivery packaging + Zomato/Swiggy commission. EXCLUDE rent, kitchen and service staff salaries, electricity, manager pay — those are fixed OpEx, not COGS.",
  },

  q10_cash_runway: {
    question_text: "If sales stopped today, how many months could you pay rent, kitchen and service salaries, and electricity from cash on hand?",
    helper: "Fixed costs = rent + kitchen and FOH salaries + electricity + Zomato Gold/Pro fees + insurance + excise/licence. Exclude raw food cost (it scales with sales).",
  },

  q11_owner_hours: {
    helper: "Include weekend service, late-night closing, supplier calls, and time on the floor or in the kitchen.",
  },

  q12_headcount: {
    helper: "Count kitchen (head chef, cooks, helpers), service (captains, stewards), and management. Include yourself if you're operating.",
  },

  q13_bottleneck: {
    question_text: "If footfall tripled this weekend, what breaks first?",
    option_labels: {
      owner_time: "My time — I'm running the floor or the pass myself",
      team: "My team — not enough captains, cooks, or trained staff",
      systems: "My systems — KOTs go missing, food quality drops, orders pile up",
      cash: "My cash — I can't fund extra raw material or payroll",
      supply: "My kitchen capacity — burners, prep space, or head chef caps output",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    option_labels: {
      energised: "Energised. I love what we're building.",
      focused_tired: "Focused but tired. Long service days, doing it.",
      drained: "Drained. Most days feel like firefighting on the floor.",
      done: "Done. I'm thinking about shutting or selling.",
    },
  },

  q15_decision_making: {
    question_text: "Who makes the day-to-day calls — menu changes, staff scheduling, vendor pricing — in the restaurant?",
    option_labels: {
      only_me: "Only me. Nothing moves without me — kitchen or floor.",
      me_and_few: "Me and 1–2 trusted people (head chef, manager)",
      team_decides: "Head chef and manager run it, I review the big calls",
      leadership_layer: "I have a chef + ops manager layer running the place",
    },
  },

  q16_founder_age: {
    helper: "Your age in completed years.",
  },
  q17_marketing_spend: {
    helper:
      'Include Zomato/Swiggy commissions (treat as a marketing tax), Gold/Pro fees, Instagram ads, hoardings and influencer dinners. Typical 25-40% once aggregator commissions are counted in full.',
  },

  q18_aggregator_share: {
    helper:
      'Add up Zomato + Swiggy revenue (gross of commission) / total revenue. If 60%+ routes through aggregators, they own your customer data, your pricing and your visibility — not you.',
  },
}
