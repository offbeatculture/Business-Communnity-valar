import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Coaching / Courses / Info-products — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const COACHING_COURSES_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text:
      "When you describe your coaching/course to a stranger, who is your one ideal student in one sentence?",
    helper:
      "Strongest answers name a persona, a specific outcome, and a time-bound trigger — like 'salaried 30-something who just quit to go freelance.'",
    option_labels: {
      specific: "I can name a persona, outcome, and trigger (e.g. 'recently quit job, wants ₹1L/mo freelance income in 90 days')",
      type_and_problem: "I can name a persona and the outcome I deliver",
      type_only: "I can name a persona only (e.g. 'working professionals' or 'students')",
      anyone: "Honestly, anyone who can pay the fee",
    },
  },

  q2_xfactor_source: {
    question_text:
      "In your students' own words — not yours — why do they pick your program over other coaches and YouTube?",
    helper:
      "Verbatim means actual quotes from testimonial calls, NPS forms, or sales-call recordings — not your own framing.",
    option_labels: {
      verbatim: "I've asked them and I can quote 3+ students verbatim (testimonials, sales-call recordings, NPS)",
      asked_general: "I've asked them and I have a general sense",
      assumed_generic: "I haven't asked, but I'm pretty sure it's my teaching style, price, or community",
      unknown: "I haven't asked. I don't really know.",
    },
  },

  q3_top3_concentration: {
    helper:
      "Count revenue per student over the last 12 months. For high-ticket 1-on-1 this often crosses 30%; for cohorts it's usually low but launch dependency is the real risk.",
  },

  q4_lead_source: {
    question_text: "Where do most of your students come from today?",
    helper:
      "Channels in this space: Meta ads, YouTube/Instagram organic, referrals, JV webinars, affiliates, SEO. Pick what actually drives enrolments — not what's loudest.",
    option_labels: {
      wom_only: "Word of mouth and student referrals only",
      one_paid: "One paid channel that's working (usually Meta ads or YouTube ads)",
      multi_channel: "Two or three channels working in parallel (e.g. Meta + organic + JVs)",
      system: "A full system: paid ads + organic content + SEO + affiliates + referrals running together",
      unclear: "Inconsistent — students enrol, I don't know exactly how they found me",
    },
  },

  q5_cpl: {
    question_text:
      "Roughly, what does it cost you to get one new lead (webinar registration, free-training opt-in, or WhatsApp opt-in)?",
    helper:
      "A lead = someone who registered for your webinar, opted into your free training, or joined your WhatsApp/email list. Most paid coaching CPLs sit at ₹50–₹500.",
  },

  q6_conversion: {
    question_text:
      "Of every 10 serious enquiries — people who showed up live to your webinar or took a sales call — how many enrol?",
    helper:
      "A serious enquiry = live webinar attendee or booked sales call, NOT every opt-in. Webinar-to-sale is typically 2–10%; sales-call-to-sale is typically 20–40%.",
  },

  q7_sales_cycle: {
    question_text:
      "From a student's first opt-in (webinar/free training) to the enrolment payment landing, how long does a typical sale take?",
    helper:
      "Evergreen funnels usually close in 1–7 days. Inside a live cohort launch window the cycle can be hours. Measure from opt-in to paid, not first awareness.",
  },

  q8_revenue_lakhs: {
    helper:
      "Total enrolment revenue (1-on-1 + cohorts + self-paced + memberships) collected in the last 12 months. Use cash collected, not booked-but-unpaid EMIs.",
  },

  q9_gross_margin: {
    helper:
      "Cost of delivery = Razorpay/Zoom/hosting fees + your prep+teach time at an hourly rate + customer-support time + guest faculty. EXCLUDE ad spend, sales-team commission, content production — those are CAC, not COGS. Done right, coaching margins are 70–95%, not 15–30%.",
  },

  q10_cash_runway: {
    helper:
      "Fixed costs = founder draw + team salaries + committed ad spend + Zoom/tools/CRM subs + sales-team commission base + office rent if any. EMIs and refunds owed count too.",
  },

  q11_owner_hours: {
    helper:
      "Include teaching, prep, sales calls, content recording, DMs, community moderation, and behind-the-scenes ops. Founder-led coaching businesses routinely run 60+ hours/week.",
  },

  q12_headcount: {
    helper:
      "Count full-time team only (you + community manager + sales closer + ops + editor). Exclude freelance editors, hourly VAs, and guest faculty.",
  },

  q13_bottleneck: {
    question_text:
      "If 3x more students enrolled tomorrow, what breaks first?",
    helper:
      "Common coaching bottlenecks: founder is the brand and can't replicate, refund tsunami after a weak cohort, or one bad launch wipes the quarter.",
    option_labels: {
      owner_time: "My time — I'm the teacher, the brand, the sales closer; I can't clone myself",
      team: "My team — no community managers, coaches, or sales closers to handle the volume",
      systems: "My systems — onboarding, support, and refunds would collapse; NPS would crash",
      cash: "My cash — I couldn't fund the ad spend or team hiring needed to deliver",
      supply: "My delivery capacity — I can't run that many live cohorts or 1-on-1 slots",
      nothing: "Nothing breaks. We could absorb 3x.",
    },
  },

  q14_owner_energy: {
    option_labels: {
      energised: "Energised. I love teaching and building this brand.",
      focused_tired: "Focused but tired. Launches, content, calls — lots to do, doing it.",
      drained: "Drained. Refunds, DMs, and the next launch never stop.",
      done: "Done. I'm thinking about selling the brand or shutting it down.",
    },
  },

  q15_decision_making: {
    helper:
      "Decisions = curriculum changes, pricing, launch calendar, ad creative approvals, refund calls, hires. Coaching businesses stay founder-led on almost everything until ~₹2Cr.",
    option_labels: {
      only_me: "Only me. Curriculum, pricing, launches, refunds — nothing moves without me.",
      me_and_few: "Me and 1–2 trusted people (usually a head of ops or lead coach)",
      team_decides: "A team runs launches and delivery, I review the big calls",
      leadership_layer: "I have a leadership layer (head of marketing, head of delivery) running the business",
    },
  },

  q16_founder_age: {
    helper: "Your age in years today.",
  },
  q17_marketing_spend: {
    helper:
      'Include Meta/Google ads, affiliate payouts, JV partner cuts, sales-team commissions and content-production team. Most coaching businesses run 30-60% — founders often under-count by forgetting closer commissions and affiliates.',
  },

  q18_repeat_rate: {
    helper:
      "Of last 12 months' revenue, how much came from students re-enrolling, upgrading, or buying your second program? Strong programs cross 30%; one-and-done businesses sit under 10% and live on the ad-spend treadmill.",
  },
}
