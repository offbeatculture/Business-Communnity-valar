import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// School / Tuition / Education — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const EDUCATION_SCHOOL_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text:
      "When you describe your school or tuition to a new parent, who is your one ideal parent in one sentence?",
    helper:
      "Think locality + income bracket + grade + board + outcome priority (board scores, holistic, college admit). Example: HSR Layout, ₹25L+ household, Class 9 ICSE, IIT-track parents.",
    option_labels: {
      specific:
        "I can name the locality, board, grade, and what outcome the parent wants",
      type_and_problem:
        "I can name the parent type (board / outcome) but not the locality or grade specifics",
      type_only:
        "I can only say 'K-12 parents' or 'JEE aspirants' — no sharper profile",
      anyone: "Honestly, any parent who walks in for a campus tour or demo",
    },
  },

  q2_xfactor_source: {
    helper:
      "In parents' own words at the gate, the open house, or the WhatsApp parent group — why did they pick you over the school down the road or the other coaching centre?",
    option_labels: {
      verbatim:
        "I've asked parents and can quote 3+ verbatim (board results, teacher names, discipline, transport)",
      asked_general:
        "I've asked at PTMs and open houses and have a general sense",
      assumed_generic:
        "I haven't asked, but I assume it's results, fees, or location",
      unknown: "I haven't really asked parents why they chose us",
    },
  },

  q3_top3_concentration: {
    question_text:
      "What percentage of your fee revenue comes from your top 3 batches or top 3 corporate / institutional tie-ups?",
    helper:
      "For K-12 schools: top 3 grade batches by headcount × fee. For tuition / coaching: top 3 batches or board-prep corporate sponsorships. Not your last 3 admissions.",
    format_hint: "Enter a number between 0 and 100.",
    unit: "%",
  },

  q4_lead_source: {
    question_text:
      "Where do most of your admission enquiries come from today?",
    option_labels: {
      wom_only: "Parent referrals and word of mouth only",
      one_paid:
        "One paid channel working (hoardings, Google, Meta, UrbanPro)",
      multi_channel:
        "Two or three channels working — hoardings + Instagram + referrals",
      system:
        "A system: open houses + demo classes + ads + referrals + aggregator portals running together",
      unclear:
        "Inconsistent — enquiries come in, I don't know exactly how",
    },
  },

  q5_cpl: {
    question_text:
      "Roughly, what does it cost you to get one admission enquiry (a parent who books a campus tour or demo class)?",
    helper:
      "Lead = parent who booked a tour or registered for a demo class — not just a hoarding eyeball or a missed call. Hoarding-driven enquiries often cost ₹3,000-8,000 per actual admission.",
    option_labels: {
      lt_100: "Under ₹100",
      "100_500": "₹100 – ₹500",
      "500_2000": "₹500 – ₹2,000",
      "2000_10000": "₹2,000 – ₹10,000 (typical for hoardings / Meta ads)",
      gt_10000: "Over ₹10,000",
      untracked: "I don't track this",
    },
  },

  q6_conversion: {
    question_text:
      "Of every 10 parents who take the campus tour or attend the demo class, roughly how many pay the admission fee?",
    helper:
      "Serious enquiry = parents who completed a campus tour or sat through a demo class — not every WhatsApp enquiry or phone call.",
    option_labels: {
      "8_plus": "8 or more pay and enrol",
      "5_7": "5 – 7 pay and enrol",
      "3_4": "3 – 4 pay and enrol",
      "1_2": "1 – 2 pay and enrol",
      lt_1: "Less than 1 in 10",
      untracked: "I don't track this",
    },
  },

  q7_sales_cycle: {
    question_text:
      "From a parent's first enquiry to fee paid and child in the classroom, how long does it typically take?",
    helper:
      "K-12 cycles are tied to the academic year — April-June dominates. Tuition / coaching cycles are shorter. Count from first enquiry to fee receipt, not to the first class.",
    option_labels: {
      same_day: "Same day (rare — usually only mid-term tuition)",
      within_week: "Within a week",
      "1_4_weeks": "1 – 4 weeks",
      "1_3_months": "1 – 3 months (typical for K-12 admissions)",
      gt_3_months: "Over 3 months (parents who enquire one cycle, join next)",
    },
  },

  q8_revenue_lakhs: {
    question_text:
      "What was your school or tuition's fee revenue (top line) in the last academic year?",
    helper:
      "Total term + annual fees collected across all batches. Include transport and bundled books if you charge for them. Remember April-June collection is most of the year.",
    format_hint: "Enter in lakhs. 50 = ₹50 lakhs. 250 = ₹2.5 crore.",
    unit: "₹ lakhs",
  },

  q9_gross_margin: {
    question_text:
      "Of every ₹100 of fee revenue, how much is left after the direct cost of running the batches / classes?",
    helper:
      "INCLUDE: teacher salaries (direct cost — each teacher is committed to specific batches), transport / school bus, bundled books / uniform, lab / sports consumables, per-student board fees. EXCLUDE: principal salary, admin, marketing, building EMI.",
    option_labels: {
      gt_70: "₹70 – ₹100 left (70%+ margin — unusual for schools)",
      "50_70": "₹50 – ₹70 left (50–70% margin)",
      "30_50": "₹30 – ₹50 left (30–50% margin)",
      "15_30": "₹15 – ₹30 left (15–30% margin — typical for K-12)",
      lt_15: "Under ₹15 left (under 15% margin)",
      untracked: "I don't track this",
    },
  },

  q10_cash_runway: {
    question_text:
      "If fee collection stopped today, how many months could you pay your fixed costs from cash on hand?",
    helper:
      "Fixed costs: teacher salaries, admin, building EMI, utilities, insurance, affiliation fees, maintenance. April-June collection has to last the whole year — count from a low-collection month.",
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
    question_text:
      "In a typical week, how many hours do you personally work in the school or tuition centre?",
    helper:
      "Include admissions calls, parent meetings, PTMs, teacher hiring, classroom observation, evenings and weekends. Founder-principals usually run all admissions and teacher hires personally.",
    format_hint: "Be honest. Including evenings and weekends.",
    unit: "hours",
  },

  q12_headcount: {
    question_text:
      "How many full-time people work in the school or centre (including you)?",
    helper:
      "Include teachers, admin, transport drivers, support staff, and yourself. Exclude visiting faculty or freelance subject experts who aren't on payroll.",
    unit: "people",
  },

  q13_bottleneck: {
    question_text:
      "If 3x more parents enquired for admission tomorrow, what breaks first?",
    option_labels: {
      owner_time:
        "My time — I personally handle every admission and parent meeting",
      team:
        "My team — I don't have enough teachers, or the teachers I have aren't strong enough",
      systems:
        "My systems — we'd lose enquiries, mess up batch allocations, miss follow-ups",
      cash:
        "My cash — I couldn't fund the extra teacher salaries or transport before fees come in",
      supply:
        "My supply — no more classrooms, no more bus seats, no more batch slots",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    question_text:
      "On most days, how do you feel walking into the school or centre?",
    option_labels: {
      energised: "Energised. I'm building something I love.",
      focused_tired:
        "Focused but tired. Lots of parent calls, teacher issues, doing it.",
      drained:
        "Drained. Most days feel like firefighting — parent complaints, teacher exits, fee defaults.",
      done: "Done. I'm thinking about exiting or shutting down.",
    },
  },

  q15_decision_making: {
    question_text:
      "Who makes the day-to-day decisions — admissions, teacher hires, parent escalations?",
    option_labels: {
      only_me:
        "Only me. Every admission, teacher hire, and parent complaint comes to me.",
      me_and_few: "Me and 1–2 trusted people (vice-principal, admin head)",
      team_decides:
        "A team handles operations, I review big calls (board changes, big hires)",
      leadership_layer:
        "I have a principal / academic head / admin head layer running operations",
    },
  },

  q16_founder_age: {
    helper: "How old are you?",
    unit: "years",
  },
  q17_marketing_spend: {
    helper:
      'Include hoardings, bus-route ads, demo classes, parent-referral incentives and admission consultants. Most schools/tuitions run 5-15% — heavily clustered around the April-June admission window.',
  },

  q18_capacity_util: {
    helper:
      'Total students enrolled / total seat capacity across all grades or batches. A 70%-full school carries every fixed cost (teachers, building EMIs, transport) of a 100%-full one.',
  },
}
