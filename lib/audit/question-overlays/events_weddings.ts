import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Events / Weddings — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const EVENTS_WEDDINGS_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text: "When you describe your planning business to a stranger, who is your one ideal client in one sentence?",
    helper: "Think budget bracket, occasion type, and region. e.g. ₹50L+ North Indian weddings in Udaipur, or Bangalore tech MICE events.",
    option_labels: {
      specific: "I can name budget bracket, occasion type, and city/region",
      type_and_problem: "I can name occasion type and what we solve (e.g. destination weddings)",
      type_only: "I can name occasion type only (weddings, corporate, social)",
      anyone: "Honestly, we take any event that walks in",
    },
  },

  q2_xfactor_source: {
    helper: "Past brides, MOTHs, or corporate clients — why did they pick you over the other planner they shortlisted? Have you actually asked?",
  },

  q3_top3_concentration: {
    question_text: "What percentage of your last 12 months' revenue came from your top 3 events or corporate clients?",
    helper: "Count each wedding as one client. For corporate event firms, count the company (Salesforce, Wipro) not each event. Top-3 mega weddings often hit 50%+.",
  },

  q4_lead_source: {
    question_text: "Where do most of your enquiries come from today?",
    option_labels: {
      wom_only: "Past bride referrals and word of mouth only",
      one_paid: "One paid channel working (WedMeGood, Shaadi.com, or Meta ads)",
      multi_channel: "Two or three channels — portal + Instagram + venue tie-ups",
      system: "A system: Instagram + portals + venue partners + referrals running together",
      unclear: "Inconsistent — enquiries come, I don't know exactly how",
    },
  },

  q5_cpl: {
    question_text: "Roughly, what does it cost you to get one qualified enquiry (couple or corporate that booked a planning meeting)?",
    helper: "A lead = booked a planning meeting in person or on video. Not every WedMeGood DM. Portal-qualified couples typically cost ₹500-5,000.",
  },

  q6_conversion: {
    question_text: "Of every 10 serious enquiries, roughly how many sign and pay the booking advance?",
    helper: "Serious enquiry = took the planning meeting and received a quote or mood board. Conversion = advance received, not just verbal yes.",
  },

  q7_sales_cycle: {
    question_text: "From first enquiry to booking advance received, how long does a typical sale take?",
    helper: "Measure enquiry to advance in your account — not enquiry to event date. Cycle is typically 1-6 months; event itself may be 1-12 months out.",
    option_labels: {
      same_day: "Same day",
      within_week: "Within a week",
      "1_4_weeks": "1 – 4 weeks",
      "1_3_months": "1 – 3 months",
      gt_3_months: "Over 3 months",
    },
  },

  q8_revenue_lakhs: {
    helper: "Total billed across all events in the last 12 months (inclusive of vendor pass-through). Peak Oct-Feb usually drives most of this.",
  },

  q9_gross_margin: {
    question_text: "Of every ₹100 of event revenue, how much is left after vendor pass-through and on-ground event costs?",
    helper: "Subtract decor, catering, photography, music, transport, day-of staff, and destination travel only. EXCLUDE your salary, office, planner team, sales, marketing — those are OpEx. Planner margin typically 15-35%.",
  },

  q10_cash_runway: {
    question_text: "If enquiries stopped today, how many months could you pay fixed costs from cash on hand?",
    helper: "Fixed costs = office rent + planner team salaries + portal subscriptions (WedMeGood, Shaadi) + insurance + sample/prop inventory. Watch the off-season Mar-Sep stretch.",
  },

  q11_owner_hours: {
    helper: "Include event-day weekends, late-night vendor calls, and recce travel. Peak season hours count too — be honest.",
  },

  q12_headcount: {
    question_text: "How many full-time people are on payroll (including you)?",
    helper: "Count planners, coordinators, and office staff on monthly salary. Exclude freelance day-of staff, vendor crew, and event-specific contractors.",
  },

  q13_bottleneck: {
    question_text: "If you suddenly got 3x more wedding enquiries tomorrow, what breaks first?",
    option_labels: {
      owner_time: "My time — I'm the lead planner, clients sign because of me",
      team: "My team — not enough planners or coordinators with the taste level",
      systems: "My systems — we'd drop vendor briefs, miss mood boards, mess up timelines",
      cash: "My cash — I couldn't float vendor advances for that many events",
      supply: "My vendors — top decor/photography/venues are already booked out in peak",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    option_labels: {
      energised: "Energised. I love designing weddings and meeting couples.",
      focused_tired: "Focused but tired. Peak season is brutal but I'm executing.",
      drained: "Drained. Every event day feels like firefighting.",
      done: "Done. I'm thinking about exiting or shutting down.",
    },
  },

  q15_decision_making: {
    question_text: "Who makes the day-to-day operational and design decisions?",
    option_labels: {
      only_me: "Only me. No mood board, vendor, or quote goes out without me.",
      me_and_few: "Me and 1–2 senior planners I trust",
      team_decides: "A planning team runs events, I review big design and budget calls",
      leadership_layer: "I have a leadership layer (lead planners, ops head) running events end-to-end",
    },
  },

  q16_founder_age: {
    helper: "Your age in years.",
  },
  q17_marketing_spend: {
    helper:
      'Include WedMeGood + Shaadi.com subscriptions, Instagram ads, venue partnership kickbacks and bridal-exhibition booths. Peak-season planners run 10-25%; high-touch planners with a strong portfolio go lower.',
  },

  q18_repeat_rate: {
    helper:
      "Of last 12 months' revenue, what % came from past-bride referrals or repeat corporate clients? Boutique planners often cross 50% on referrals alone — that's the moat that lets you stop chasing portals.",
  },
}
