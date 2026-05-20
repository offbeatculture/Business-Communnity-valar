import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Lawyer / CA / Doctor / Solo Pro — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const PROFESSIONAL_SERVICES_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text:
      "When you describe your practice to a stranger, who is your one ideal client in one sentence?",
    helper:
      "Think client type plus matter type — e.g. 'startups raising Series A needing FEMA opinions' or 'HNI families needing estate planning'. Not just 'corporates' or 'individuals'.",
    option_labels: {
      specific: "I can name a specific client type, matter type, and trigger",
      type_and_problem: "I can name a client type and the matter I handle",
      type_only: "I can name a client type only (corporate / HNI / individual)",
      anyone: "Honestly, I take any brief that walks in",
    },
  },

  q2_xfactor_source: {
    question_text:
      "In your clients' own words — not yours — why do they engage you over other lawyers / CAs / doctors?",
    helper:
      "Have 3+ repeat clients told you exactly why they keep coming back? Specifics like 'you actually pick up the phone' or 'you explained the SC ruling in plain English' count — not 'good service'.",
    option_labels: {
      verbatim: "I've asked them and I can quote 3+ clients verbatim",
      asked_general: "I've asked them and I have a general sense",
      assumed_generic: "I haven't asked, but I'm sure it's expertise, responsiveness, or fees",
      unknown: "I haven't asked. I don't really know.",
    },
  },

  q3_top3_concentration: {
    helper:
      "Add the fees billed to your top 3 retainer or repeat clients in the last 12 months and divide by total billings. Most solo practices find 50%+ comes from 1-3 long-standing clients.",
  },

  q4_lead_source: {
    question_text: "Where do most of your new clients come from today?",
    helper:
      "Most professional practices run on referrals (existing clients, CA-lawyer cross-referrals, bar/chamber). Count Justdial / Vakilsearch / LinkedIn / Practo only if they actually deliver paying clients.",
    option_labels: {
      wom_only: "Word of mouth and professional cross-referrals only",
      one_paid: "One paid channel working (Justdial, Vakilsearch, Practo, LinkedIn ads)",
      multi_channel: "Two or three channels — referrals plus LinkedIn plus a directory",
      system: "A system: content + referrals + directory listings + speaking running together",
      unclear: "Inconsistent — clients come, I don't track exactly how",
    },
  },

  q5_cpl: {
    question_text:
      "Roughly, what does it cost you to get one new serious enquiry (someone who books an introductory consult)?",
    helper:
      "A lead = a prospect who actually booked a consult, not just a LinkedIn DM or a Justdial click. Referrals are ₹0. Paid leads via Justdial / Vakilsearch / LinkedIn usually run ₹500-3,000 each.",
  },

  q6_conversion: {
    question_text:
      "Of every 10 prospects who take an introductory consult and ask for a fee quote, how many sign the engagement letter?",
    helper:
      "Count from 'they sat through the consult and asked for a fee note' to 'engagement letter signed and first invoice paid'. Not casual enquiries.",
  },

  q7_sales_cycle: {
    question_text:
      "From first consult to engagement letter signed and first invoice paid, how long does a typical client take?",
    helper:
      "Most one-off matters (drafting, opinion, OPD, tax filing) close in 1-14 days. Big corporate retainers or hospital empanelments often take 2-8 weeks.",
  },

  q8_revenue_lakhs: {
    question_text:
      "What did your practice bill (fees + brief fees + retainers, net of GST) in the last 12 months?",
    helper:
      "Total professional fees billed across all matters and retainers. Exclude reimbursable pass-throughs (court fees, stamp paper, filing fees) — that's not your revenue.",
  },

  q9_gross_margin: {
    question_text:
      "Of every ₹100 you bill, how much is left after the direct cost of delivering that matter?",
    helper:
      "INCLUDE: junior associate / paraprofessional time billed to the matter, court / filing / stamp fees, external opinions. EXCLUDE: your own time, office rent, marketing — those are OpEx, not delivery cost. True margin is usually 80-95%.",
  },

  q10_cash_runway: {
    question_text:
      "If billings stopped today, how many months could you pay your fixed costs from cash on hand?",
    helper:
      "Fixed costs = office rent, junior / staff salaries, council fees, professional indemnity, software (tax / legal research / case management). You ARE the runway — if you can't work, the practice earns nothing.",
  },

  q11_owner_hours: {
    question_text:
      "In a typical week, how many hours do you personally spend on the practice?",
    helper:
      "Include client meetings, drafting, court / hospital time, calls, emails, evenings, weekends. Solo professionals routinely clock 60+ hours and don't realise they ARE the bottleneck — be honest.",
  },

  q12_headcount: {
    question_text:
      "How many full-time people work in the practice (including you, juniors, paralegals, articles, receptionist)?",
    helper:
      "Count yourself, junior associates / articled clerks / RMOs, paralegals, receptionist, accountant if on payroll. Exclude on-call counsel or visiting consultants paid per matter.",
  },

  q13_bottleneck: {
    question_text:
      "If your practice suddenly got 3x more briefs / matters tomorrow, what breaks first?",
    option_labels: {
      owner_time: "My time — I personally vet / sign every matter",
      team: "My team — not enough juniors or skilled associates",
      systems: "My systems — we'd miss deadlines, lose files, drop quality",
      cash: "My cash — I couldn't fund staff additions or working capital",
      supply: "My capacity — court days / OPD slots / regulatory bandwidth caps me",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    question_text: "On most days, how do you feel walking into chambers / clinic / office?",
    option_labels: {
      energised: "Energised. I love the practice I'm building.",
      focused_tired: "Focused but tired. Heavy matter load, getting through it.",
      drained: "Drained. Most days feel like deadline firefighting.",
      done: "Done. I'm thinking about winding down or joining a firm.",
    },
  },

  q15_decision_making: {
    question_text:
      "Who makes the day-to-day decisions in the practice (matter strategy, fee quotes, hiring, client intake)?",
    option_labels: {
      only_me: "Only me. Every brief, fee note and decision goes through me.",
      me_and_few: "Me and 1-2 trusted associates or my office manager",
      team_decides: "Senior associates run matters, I review the big ones",
      leadership_layer: "I have partners / senior counsel running the practice",
    },
  },

  q16_founder_age: {
    helper: "Your age in years.",
  },
  q17_marketing_spend: {
    helper:
      'Include LinkedIn ads, Justdial/Vakeel subscriptions, conferences and content production. Most solo CAs/lawyers/doctors run 0-5% — professional referrals do almost all the work.',
  },

  q18_repeat_rate: {
    helper:
      "Of last 12 months' fee revenue, what % came from clients who hired you before (repeat matters or extended retainers)? Retainer-heavy practices often cross 70%; matter-by-matter practices live under 30%.",
  },
}
