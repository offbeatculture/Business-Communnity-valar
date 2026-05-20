import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Construction / Interior Design — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const CONSTRUCTION_INTERIOR_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text:
      "When you describe your practice to a stranger, who is your one ideal homeowner client in one sentence?",
    helper:
      "Think segment + project size + city + style. Example: '2,500-3,500 sqft Bengaluru villa owners wanting minimalist turnkey interiors at ₹3,500-5,000/sqft.'",
    option_labels: {
      specific:
        "I can name segment, project size, city, and style preference",
      type_and_problem:
        "I can name the homeowner type and the brief I solve (e.g. 'luxury apartment full-home interiors')",
      type_only:
        "I can name a homeowner type only (e.g. 'villa owners' or 'flat buyers')",
      anyone: "Honestly, I take any project that comes in",
    },
  },

  q2_xfactor_source: {
    helper:
      "Past clients in their own words — not your pitch. Quote the line they used in the testimonial, handover review, or referral to a friend.",
    option_labels: {
      verbatim:
        "I've asked past clients and can quote 3+ verbatim (design eye, on-time handover, no cost overrun, etc.)",
      asked_general:
        "I've asked clients and have a general sense of why they pick me",
      assumed_generic:
        "I haven't asked, but I assume it's design quality, price, or finish",
      unknown: "I haven't asked. I don't really know.",
    },
  },

  q3_top3_concentration: {
    question_text:
      "What percentage of your last 12 months' revenue came from your top 3 active projects?",
    helper:
      "Count by project, not by client. Include design fee + execution billings on each site. Most studios sit at 60-80% here.",
  },

  q4_lead_source: {
    question_text:
      "Where do most of your homeowner enquiries come from today?",
    helper:
      "Pick what brings the majority of booked consultations. Channels: past-client referrals, Instagram, Houzz/Pinterest, builder tie-ups, Google, walk-ins to studio.",
    option_labels: {
      wom_only: "Past-client and builder referrals only",
      one_paid:
        "One paid channel working (Instagram ads, Google, Houzz Pro, Meta)",
      multi_channel:
        "Two or three channels in parallel (e.g. Instagram + referrals + Houzz)",
      system:
        "A system: portfolio content + ads + SEO + referral programme running together",
      unclear:
        "Inconsistent — enquiries come, I can't trace the source cleanly",
    },
  },

  q5_cpl: {
    question_text:
      "Roughly, what does it cost you to get one qualified lead — a homeowner who books a design consultation or site visit?",
    helper:
      "Count a booked consult or site visit, not every Instagram DM or Houzz click. Ad spend + listing fees ÷ booked consults. Typical range ₹2,000-15,000.",
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
    question_text:
      "Of every 10 homeowners who take the paid design consult and see your first concept boards, how many sign the execution contract?",
    helper:
      "A 'serious enquiry' = took the design consult and saw concept boards + material samples. Not every site-visit enquiry.",
  },

  q7_sales_cycle: {
    question_text:
      "From first homeowner consultation to signed execution contract with material advance received, how long does a typical sale take?",
    helper:
      "Measure consult to contract signed and first payment in, not project handover. Typical 1-4 months for interiors; longer for full-build RCC.",
  },

  q8_revenue_lakhs: {
    helper:
      "Last 12 months total billings — design fees + execution (BoQ) collections combined. Use billed-and-collected, not the pipeline value of signed projects.",
  },

  q9_gross_margin: {
    question_text:
      "Of every ₹100 of project revenue, how much is left after the direct cost of executing that site?",
    helper:
      "INCLUDE: materials (tile, wood, paint, marble, sanitary, MEP), sub-contractor labour, site supervisor on that site, transport, commissioning. EXCLUDE: office, principal architect's design time, marketing, sales. Report execution margin (15-30%), not design-fee margin.",
    option_labels: {
      gt_70: "₹70 – ₹100 left (70%+ margin) — usually only pure design fees",
      "50_70": "₹50 – ₹70 left (50–70%) — design-heavy mix",
      "30_50": "₹30 – ₹50 left (30–50%) — design + supervision, minimal execution",
      "15_30":
        "₹15 – ₹30 left (15–30%) — typical turnkey execution margin",
      lt_15: "Under ₹15 left — execution at near-zero margin",
      untracked: "I don't track this",
    },
  },

  q10_cash_runway: {
    question_text:
      "If new project bookings stopped today, how many months could you pay fixed costs from your own cash — not from client material advances?",
    helper:
      "Fixed = office rent, principal + designer salaries, site supervisor retainers, software (AutoCAD/SketchUp/Vray), warehouse. Do NOT count client material advances as runway — those are owed to vendors.",
  },

  q11_owner_hours: {
    helper:
      "All hours running the practice — client meets, design reviews, site visits, vendor calls, BoQ approvals, evening WhatsApps with site supervisors.",
  },

  q12_headcount: {
    helper:
      "Full-time on payroll only — principal, designers, site supervisors, draftsmen, admin. Exclude project sub-contractors and daily-wage site labour.",
  },

  q13_bottleneck: {
    question_text:
      "If 3 new turnkey projects landed in your studio next month, what breaks first?",
    option_labels: {
      owner_time:
        "My time — I'm reviewing every drawing, every site, every BoQ",
      team:
        "My team — not enough designers or site supervisors to run more sites",
      systems:
        "My systems — drawings, BoQs, snag lists and milestones would slip",
      cash: "My cash — I can't float material advances on more sites at once",
      supply:
        "My supply — reliable sub-contractors and key material vendors are stretched",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    question_text:
      "On most days, how do you feel walking into the studio or onto a site?",
    option_labels: {
      energised: "Energised. I love the design work and seeing sites come alive.",
      focused_tired:
        "Focused but tired. Juggling design reviews, site issues, client calls.",
      drained:
        "Drained. Most days are site fires, client escalations, vendor chasing.",
      done: "Done. I'm thinking about shutting the practice or going solo-only.",
    },
  },

  q15_decision_making: {
    question_text:
      "Who makes day-to-day decisions on design, site execution, and vendor payments?",
    option_labels: {
      only_me:
        "Only me. Every drawing, BoQ line, and vendor payment needs my sign-off.",
      me_and_few:
        "Me and 1–2 trusted people (senior designer or project manager)",
      team_decides:
        "Designers and site supervisors decide on their sites; I review big calls",
      leadership_layer:
        "I have a design head + project head running the practice",
    },
  },

  q16_founder_age: {
    helper: "How old are you, the principal architect or designer?",
  },
  q17_marketing_spend: {
    helper:
      'Include Houzz/Pinterest ads, Instagram, builder-referral incentives, portfolio shoots, brochures and show-flat models. Most interior firms run 3-10% — referral and completed-work driven.',
  },

  q18_dso_days: {
    helper:
      "From milestone-completion sign-off to client payment in bank, across all active projects. Site overruns and execution disputes push this past 60 days fast — and that's your money trapped on someone else's site.",
  },
}
