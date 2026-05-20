import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// SaaS / B2B Software — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const SAAS_B2B_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text: "When you describe your SaaS to a stranger, who is your one ideal customer in one sentence?",
    helper: "Think ICP: company size, industry, role of the buyer, and the trigger that makes them shortlist you (e.g. Series A fintechs, Head of Ops, post-funding hiring spike).",
    option_labels: {
      specific: "I can name a specific ICP — segment, buyer role, and trigger event",
      type_and_problem: "I can name a segment and the problem we solve",
      type_only: "I can name a segment only (industry or company size)",
      anyone: "Honestly, we sell to anyone who'll take a demo",
    },
  },

  q2_xfactor_source: {
    helper: "Your champions' actual words from sales calls, NPS replies, or renewal calls — not your pitch deck or G2 reviews you wrote.",
    option_labels: {
      verbatim: "I've talked to 3+ customers and can quote their exact words",
      asked_general: "I've asked customers and have a general sense",
      assumed_generic: "I haven't asked — I assume it's features, price, or support",
      unknown: "I haven't asked. I don't really know.",
    },
  },

  q3_top3_concentration: {
    question_text: "What percentage of your MRR/ARR comes from your top 3 accounts?",
    helper: "Add the MRR of your three largest paying accounts and divide by total MRR. Include any anchor design-partner account here.",
    unit: "%",
    format_hint: "Enter a number between 0 and 100.",
  },

  q4_lead_source: {
    question_text: "Where does most of your pipeline come from today?",
    helper: "Pipeline = qualified opps that took a first call, not raw signups or site traffic.",
    option_labels: {
      wom_only: "Founder network and customer referrals only",
      one_paid: "One channel working (outbound SDR, inbound demos, or PLG signups)",
      multi_channel: "Two or three channels working in parallel",
      system: "A full system: outbound + inbound + content/SEO + partnerships",
      unclear: "Inconsistent — opps come in, I can't attribute them cleanly",
    },
  },

  q5_cpl: {
    question_text: "Roughly, what does it cost you to get one qualified lead (demo booked or sales-accepted signup)?",
    helper: "A lead = a demo booked or an SQL — NOT a raw site visitor or free trial signup. Divide total sales+marketing spend by qualified leads generated.",
    unit: "₹",
    option_labels: {
      lt_100: "Under ₹100",
      "100_500": "₹100 – ₹500",
      "500_2000": "₹500 – ₹2,000",
      "2000_10000": "₹2,000 – ₹10,000",
      gt_10000: "Over ₹10,000",
      untracked: "I don't track this",
    },
  },

  q6_conversion: {
    question_text: "Of every 10 sales-qualified opps (took a first call), roughly how many become paying customers?",
    helper: "A serious enquiry = an opp that took a discovery/demo call, not a raw signup or MQL.",
    option_labels: {
      "8_plus": "8 or more",
      "5_7": "5 – 7",
      "3_4": "3 – 4",
      "1_2": "1 – 2",
      lt_1: "Less than 1",
      untracked: "I don't track this",
    },
  },

  q7_sales_cycle: {
    question_text: "From first sales call to signed contract and first invoice paid, how long does a typical deal take?",
    helper: "Measure from discovery call to cash collected — not signup to activation. SMB SaaS is usually 30–90 days; mid-market can be 3–9 months.",
    option_labels: {
      same_day: "Same day (self-serve PLG checkout)",
      within_week: "Within a week",
      "1_4_weeks": "1 – 4 weeks",
      "1_3_months": "1 – 3 months",
      gt_3_months: "Over 3 months",
    },
  },

  q8_revenue_lakhs: {
    question_text: "What was your ARR (or trailing 12-month revenue) in the last 12 months?",
    helper: "Use ARR if subscription, or T12M booked revenue. 50 = ₹50 lakhs, 250 = ₹2.5 crore.",
    unit: "₹ lakhs",
    format_hint: "Enter in lakhs. 50 = ₹50 lakhs. 250 = ₹2.5 crore.",
  },

  q9_gross_margin: {
    question_text: "Of every ₹100 of revenue, how much is left after the direct cost of running and supporting the product?",
    helper: "COGS = hosting/AWS + 3rd-party APIs + customer-success cost only. EXCLUDE sales, marketing, and R&D — those are OpEx, not COGS. Healthy SaaS sits at 75–90%.",
    unit: "%",
    option_labels: {
      gt_70: "₹70 – ₹100 left (70%+ margin) — healthy SaaS",
      "50_70": "₹50 – ₹70 left (50–70% margin)",
      "30_50": "₹30 – ₹50 left (30–50% margin) — likely mis-counting OpEx as COGS",
      "15_30": "₹15 – ₹30 left (15–30% margin)",
      lt_15: "Under ₹15 left (under 15% margin)",
      untracked: "I don't track this",
    },
  },

  q10_cash_runway: {
    question_text: "If new revenue stopped today, how many months could you cover fixed costs from cash on hand?",
    helper: "Fixed costs = eng + sales + CS salaries + AWS bill + tooling subs (Salesforce, HubSpot, Linear, etc.) + office rent. Runway = cash ÷ monthly burn.",
    unit: "months",
    option_labels: {
      lt_1: "Less than 1 month",
      "1_3": "1 – 3 months",
      "3_6": "3 – 6 months",
      "6_12": "6 – 12 months",
      gt_12: "More than 12 months",
      untracked: "I don't track this",
    },
  },

  q11_owner_hours: {
    helper: "Be honest. Include founder-led-sales calls, customer-success escalations, and weekend code reviews.",
    unit: "hours",
    format_hint: "Be honest. Including evenings and weekends.",
  },

  q12_headcount: {
    question_text: "How many full-time people are on the team (including founders)?",
    helper: "Count full-time across engineering, sales, customer success, and ops. Exclude advisors and part-time contractors.",
    unit: "people",
  },

  q13_bottleneck: {
    question_text: "If your pipeline suddenly 3x'd next quarter, what breaks first?",
    option_labels: {
      owner_time: "Founder time — I'm still running every sales call and demo",
      team: "Team — no VP Sales, not enough AEs/SDRs or senior engineers",
      systems: "Systems — onboarding, CRM hygiene, or support would collapse",
      cash: "Cash — I can't fund the AE hires and CS ramp upfront",
      supply: "Product — engineering velocity can't ship what new accounts need",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    option_labels: {
      energised: "Energised. I'm building something I love.",
      focused_tired: "Focused but tired. Heads-down on the next ARR milestone.",
      drained: "Drained. Firefighting churn, deals, and outages.",
      done: "Done. I'm thinking about an acqui-hire or exit.",
    },
  },

  q15_decision_making: {
    helper: "SaaS founders usually run sales themselves until ~₹5Cr ARR. A real leadership layer means a VP Sales, Head of Product, and Head of CS who own their numbers.",
    option_labels: {
      only_me: "Only me. I'm CEO, Head of Sales, and Head of Product",
      me_and_few: "Me and 1–2 co-founders or early leads",
      team_decides: "Functional leads decide; I review the big calls",
      leadership_layer: "Full leadership layer (VP Sales, Head of Product, Head of CS) runs ops",
    },
  },

  q16_founder_age: {
    unit: "years",
  },
  q17_marketing_spend: {
    helper:
      'Include paid ads, sales-team comp, SDR salaries, content production and marketing tools (HubSpot, ABM platforms). Healthy SMB SaaS sits at 30-50% of ARR; below 20% usually means under-investing in growth.',
  },

  q18_monthly_churn: {
    helper:
      'Monthly logo churn = cancellations / total accounts at month-start. Net revenue churn (including downgrades) is better if you have it. SMB SaaS in India typically sits at 3-7% — under 2% is best-in-class.',
  },
}
