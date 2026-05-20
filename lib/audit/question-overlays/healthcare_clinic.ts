import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Healthcare / Clinic / Wellness — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const HEALTHCARE_CLINIC_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text:
      "When you describe your clinic to a stranger, who is your one ideal patient in one sentence?",
    helper:
      "Think condition or specialty + payor type (cash, insurance, corporate, TPA) + age group. Example: 'cash-pay knee-pain patients, 45–65, walk-in from a 5km radius.'",
    option_labels: {
      specific:
        "I can name a condition or specialty, payor type, and age group",
      type_and_problem:
        "I can name a specialty and the condition I treat",
      type_only:
        "I can name a patient type only (specialty or demographic)",
      anyone: "Honestly, I treat anyone who walks in or gets referred",
    },
  },

  q2_xfactor_source: {
    question_text:
      "In your patients' own words — not yours — why do they pick your clinic over others nearby?",
    helper:
      "Google reviews, Practo reviews, exit feedback or post-procedure calls count. Not your assumption about doctor reputation or location.",
    option_labels: {
      verbatim:
        "I've asked patients and can quote 3+ verbatim (reviews, exit feedback)",
      asked_general:
        "I've asked and have a general sense from feedback forms",
      assumed_generic:
        "I haven't asked, but I'm pretty sure it's doctor reputation, location, or price",
      unknown: "I haven't asked patients. I don't really know.",
    },
  },

  q3_top3_concentration: {
    question_text:
      "What percentage of your revenue comes from your top 3 corporate accounts or TPA empanelments?",
    helper:
      "Count top-3 corporate tie-ups, TPAs, or insurance panels — not individual patients. If Apollo TPA or one corporate is 40%+ and pulls out, this is your concentration risk.",
    unit: "%",
    format_hint: "Enter a number between 0 and 100.",
  },

  q4_lead_source: {
    question_text:
      "Where do most of your patients come from today?",
    helper:
      "Channels: doctor referrals, Google Maps + reviews, Practo, corporate tie-ups, walk-in, Instagram (for elective/cosmetic), MR networks.",
    option_labels: {
      wom_only: "Doctor referrals and patient word of mouth only",
      one_paid: "One paid channel working (Practo, Google Ads, or Meta)",
      multi_channel:
        "Two or three channels in parallel (e.g. Practo + referrals + Google)",
      system:
        "A system: referrals + Practo + Google reviews + corporate tie-ups + Insta running together",
      unclear:
        "Inconsistent — patients come, I don't know exactly how they found us",
    },
  },

  q5_cpl: {
    question_text:
      "Roughly, what does it cost you to get one new patient booking (a confirmed consultation, not a profile view)?",
    helper:
      "A lead = a booked consultation appointment. Not a Practo profile view or Google Maps tap. Practo paid leads typically run ₹200–1,500 per booking.",
    unit: "₹",
    option_labels: {
      lt_100: "Under ₹100 per booking",
      "100_500": "₹100 – ₹500 per booking",
      "500_2000": "₹500 – ₹2,000 per booking",
      "2000_10000": "₹2,000 – ₹10,000 per booking",
      gt_10000: "Over ₹10,000 per booking",
      untracked: "I don't track this",
    },
  },

  q6_conversion: {
    question_text:
      "Of every 10 patients who came in for a first consultation, roughly how many went on to book a procedure or treatment package?",
    helper:
      "Serious enquiry = patient who actually showed up for first consult. Conversion = % who booked a procedure, package, or repeat visit plan. Not just enquiries on phone.",
    option_labels: {
      "8_plus": "8 or more book a procedure or package",
      "5_7": "5 – 7 book a procedure or package",
      "3_4": "3 – 4 book a procedure or package",
      "1_2": "1 – 2 book a procedure or package",
      lt_1: "Less than 1 — most come for consult only",
      untracked: "I don't track this",
    },
  },

  q7_sales_cycle: {
    question_text:
      "From first consultation to procedure billed, how long does a typical patient journey take?",
    helper:
      "Measure from first consult to procedure billed (or package paid). Most clinic work: 1–30 days. Elective or cosmetic can run 1–3 months.",
    option_labels: {
      same_day: "Same day — consult and procedure together",
      within_week: "Within a week of first consult",
      "1_4_weeks": "1 – 4 weeks from consult to procedure",
      "1_3_months": "1 – 3 months (elective, cosmetic, planned surgery)",
      gt_3_months: "Over 3 months",
    },
  },

  q8_revenue_lakhs: {
    question_text:
      "What was your clinic's revenue (top line, OPD + IPD + procedures + packages) in the last 12 months?",
    helper:
      "Total billed revenue across OPD, IPD, procedures, packages, diagnostics — gross of TPA deductions. 50 = ₹50 lakhs. 250 = ₹2.5 crore.",
    unit: "₹ lakhs",
    format_hint: "Enter in lakhs. 50 = ₹50 lakhs. 250 = ₹2.5 crore.",
  },

  q9_gross_margin: {
    question_text:
      "Of every ₹100 billed, how much is left after the direct cost of delivering care?",
    helper:
      "INCLUDE: consumables, doctor share/commission for visiting consultants, outsourced lab cost, implant cost, diagnostic kit consumption. EXCLUDE: rent, nursing/admin salaries, equipment depreciation, electricity, NABH/AMC fees, marketing. Healthy clinic: 50–70%.",
    unit: "%",
    option_labels: {
      gt_70: "₹70 – ₹100 left (70%+ margin)",
      "50_70": "₹50 – ₹70 left (50–70% margin — healthy clinic range)",
      "30_50": "₹30 – ₹50 left (30–50% margin)",
      "15_30": "₹15 – ₹30 left (15–30% margin)",
      lt_15: "Under ₹15 left (under 15% margin)",
      untracked: "I don't track this",
    },
  },

  q10_cash_runway: {
    question_text:
      "If billing stopped today, how many months could you pay fixed costs from cash actually in hand (not invoiced TPA receivables)?",
    helper:
      "Fixed = doctor retainers + nursing/admin salaries + rent + equipment EMIs + NABH/AMC/audit fees + electricity + Practo/corporate subs. Count cash in bank, NOT TPA receivables — they age 60–90+ days.",
    unit: "months",
    option_labels: {
      lt_1: "Less than 1 month of cash on hand",
      "1_3": "1 – 3 months",
      "3_6": "3 – 6 months",
      "6_12": "6 – 12 months",
      gt_12: "More than 12 months",
      untracked: "I don't track this",
    },
  },

  q11_owner_hours: {
    question_text:
      "In a typical week, how many hours do you personally work in the clinic (consulting + admin + everything)?",
    helper:
      "Count OPD hours, procedures, admin, MRD review, TPA follow-ups, evenings and weekends. Be honest.",
    unit: "hours",
    format_hint: "Be honest. Including evenings and weekends.",
  },

  q12_headcount: {
    question_text:
      "How many full-time people work in the clinic (including you, doctors on retainer, nursing, admin, MRD)?",
    helper:
      "Count full-timers only: doctors on retainer, nursing, front-desk, MRD, billing, housekeeping. Exclude visiting consultants paid per case.",
    unit: "people",
  },

  q13_bottleneck: {
    question_text:
      "If patient demand suddenly 3x'd tomorrow, what breaks first in your clinic?",
    helper:
      "Think operationally: lead doctor leaves, equipment breakdown, TPA receivables aging, NABH audit, or just no chair/bed capacity.",
    option_labels: {
      owner_time:
        "My time — I'm the lead doctor and already the bottleneck",
      team:
        "My team — not enough doctors, nursing, or trained staff",
      systems:
        "My systems — appointments, MRD, billing, TPA paperwork would collapse",
      cash:
        "My cash — TPA receivables age 60–90 days, I can't fund consumables and payroll spike",
      supply:
        "My capacity — no more chairs, beds, OT slots, or equipment hours",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    helper:
      "Think about a normal OPD day — not your best week, not your worst.",
  },

  q15_decision_making: {
    question_text:
      "Who makes the day-to-day operational decisions in your clinic?",
    helper:
      "Founder-doctor making every call, or non-clinician CEO with doctor co-founder, or clinic manager + medical director layer running it.",
    option_labels: {
      only_me: "Only me. Nothing moves without me — clinical or admin.",
      me_and_few:
        "Me and 1–2 trusted people (clinic manager or co-founder doctor)",
      team_decides:
        "A team (clinic manager + senior nursing) decides, I review big calls",
      leadership_layer:
        "I have a leadership layer (medical director + admin head) running operations",
    },
  },

  q16_founder_age: {
    helper: "Your age in years.",
    unit: "years",
  },
  q17_marketing_spend: {
    helper:
      'Include Practo subscriptions, Google Maps/Ads, doctor-referral incentives, camps/screenings and Instagram for elective procedures. Most clinics run 3-12% — referral-heavy work pulls this down.',
  },

  q18_capacity_util: {
    helper:
      'Average OPD slots booked / total slots available, across the last 30 days. A 60%-utilised clinic carries the same doctor, rent and nursing cost as a 90%-utilised one — every empty slot is pure loss.',
  },
}
