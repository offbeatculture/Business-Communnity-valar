import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Agency / Consulting / Services — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const AGENCY_SERVICES_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text:
      "When you describe your agency to a stranger, who is your one ideal client in one sentence?",
    helper:
      "Think account type, stage, and the trigger that makes them sign. Example: Series A SaaS founders post-funding who need to hire a CMO.",
    option_labels: {
      specific: "I can name a specific client type, problem, and trigger",
      type_and_problem: "I can name a client type and the problem I solve",
      type_only: "I can name a client type only (industry or company size)",
      anyone: "Honestly, I take any account that'll sign an SOW",
    },
  },

  q2_xfactor_source: {
    question_text:
      "In your clients' own words — not yours — why do they pick you over other agencies and consultants?",
    helper:
      "Quotes from referral calls, NPS replies, or renewal conversations count. Not your pitch deck or your About page.",
    option_labels: {
      verbatim: "I've asked them and I can quote 3+ clients verbatim",
      asked_general: "I've asked them and I have a general sense",
      assumed_generic:
        "I haven't asked, but I'm pretty sure it's senior attention, pricing, or quality of work",
      unknown: "I haven't asked. I don't really know.",
    },
  },

  q3_top3_concentration: {
    helper:
      "Count retainer + project revenue from your top 3 active accounts in the last 12 months. 50%+ means one churn wipes a quarter.",
  },

  q4_lead_source: {
    question_text: "Where do most of your new clients come from today?",
    option_labels: {
      wom_only: "Referrals and word of mouth from past clients only",
      one_paid:
        "One paid channel that's working (LinkedIn ads, Google, outbound)",
      multi_channel:
        "Two or three channels in parallel (referrals + founder LinkedIn + partnerships)",
      system:
        "A system: content + outbound + partnerships + referrals running together",
      unclear:
        "Inconsistent — discovery calls land, I don't know exactly how",
    },
  },

  q5_cpl: {
    question_text:
      "Roughly, what does it cost you to get one booked discovery call from a qualified prospect?",
    helper:
      "A lead = a booked discovery call from a qualified inbound or warm referral. Not a LinkedIn connection or a newsletter signup.",
  },

  q6_conversion: {
    question_text:
      "Of every 10 discovery calls where you sent a proposal, roughly how many turn into a signed SOW?",
    helper:
      "A serious enquiry here = you took the discovery call and sent a proposal or SOW. Count the close, not the call.",
  },

  q7_sales_cycle: {
    question_text:
      "From first discovery call to signed SOW and first invoice paid, how long does a typical sale take?",
    helper:
      "Most agency sales run 2–8 weeks: discovery, proposal, scoping, legal, PO, first invoice. Pick the typical, not the fastest.",
  },

  q8_revenue_lakhs: {
    helper:
      "Total agency billings in the last 12 months — retainers plus project fees plus any pass-through. Top line, before COGS.",
  },

  q9_gross_margin: {
    question_text:
      "Of every ₹100 of client revenue, how much is left after the direct cost of delivering that work?",
    helper:
      "Include only: senior + junior team time spent on client work, freelancer pass-through, dedicated tools. Exclude BD, marketing, rent, and your non-billable founder hours.",
  },

  q10_cash_runway: {
    helper:
      "Fixed costs here = team salaries (your biggest line), rent, software subs, retainers to specialists, tax provisions. Cash on hand divided by that monthly burn.",
  },

  q11_owner_hours: {
    helper:
      "Include client calls, account-director hours on top accounts, BD, hiring, ops, content. Be honest — evenings and weekends count.",
  },

  q12_headcount: {
    question_text:
      "How many full-time people work in the agency (including you)? Exclude regular freelancers.",
    helper:
      "Count full-time team only. Don't count freelancers or specialists you brief project by project, even if you use them every month.",
  },

  q13_bottleneck: {
    question_text:
      "If you suddenly tripled your booked retainers tomorrow, what breaks first?",
    option_labels: {
      owner_time:
        "My time — I'm the account director on every big account",
      team:
        "My team — I don't have enough senior delivery talent to staff it",
      systems:
        "My systems — scope creep, missed deliverables, NPS would crash",
      cash:
        "My cash — I couldn't fund payroll before client invoices clear",
      supply:
        "My specialist supply — I can't source enough freelancers fast enough",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    helper:
      "Think about the average Monday — client escalations, team 1:1s, pitches, invoicing. Not your best week, not your worst.",
  },

  q15_decision_making: {
    option_labels: {
      only_me: "Only me. I'm account director on every account.",
      me_and_few:
        "Me and 1–2 senior leads who run their own accounts",
      team_decides:
        "Account directors run their books, I review the big calls",
      leadership_layer:
        "I have a leadership layer (delivery head, ops, growth) running it",
    },
  },

  q16_founder_age: {
    helper: "Your age in years.",
  },
  q17_marketing_spend: {
    helper:
      'Include founder LinkedIn time at cost, BD team salaries, paid ads (rare), conferences and sponsored content. Most boutique agencies grow on referrals — often under 5% of revenue.',
  },

  q18_dso_days: {
    helper:
      "From invoice issued to money in bank, averaged across last 6 months. Corporate clients often pay 60-90 days; founder-relationship clients pay faster. Long DSO + retainer concentration = you're financing your clients.",
  },
}
