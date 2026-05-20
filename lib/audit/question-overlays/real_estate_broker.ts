import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Real Estate / Broking — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const REAL_ESTATE_BROKER_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text:
      "When you describe your broking business to a stranger, who is your one ideal investor in one sentence?",
    helper:
      "Investor profile (NRI, HNI, first-buyer, end-user) plus segment (luxury, mid-segment, commercial) plus price band. Not 'anyone looking to buy'.",
    option_labels: {
      specific:
        "I can name a specific investor profile, segment, and price band",
      type_and_problem:
        "I can name an investor profile and what they're trying to solve",
      type_only:
        "I can name an investor type only (NRI, HNI, end-user)",
      anyone: "Honestly, I close with anyone who'll book",
    },
  },

  q2_xfactor_source: {
    question_text:
      "In your investors' own words — not yours — why do they buy through you instead of going direct to the builder or another broker?",
    helper:
      "Quote actual NRI / HNI / repeat-investor lines back. Not 'good service' or 'trust' — what they specifically said when you asked.",
    option_labels: {
      verbatim: "I've asked them and I can quote 3+ investors verbatim",
      asked_general: "I've asked them and I have a general sense",
      assumed_generic:
        "I haven't asked, but I'm pretty sure it's pricing, access, or relationship",
      unknown: "I haven't asked. I don't really know.",
    },
  },

  q3_top3_concentration: {
    helper:
      "Count repeat INVESTORS, not last 3 deals. Add up brokerage from your top 3 investors (NRIs / HNIs who buy multiple units) over 12 months as % of total brokerage.",
  },

  q4_lead_source: {
    question_text: "Where do most of your serious investors come from today?",
    helper:
      "Where booked-site-visit investors come from — not 99acres clicks. NRI referrals, builder tie-ups, Magicbricks paid, Instagram, WhatsApp groups.",
    option_labels: {
      wom_only: "NRI / HNI referrals and repeat investors only",
      one_paid:
        "One paid channel working (99acres, Magicbricks, Meta ads)",
      multi_channel:
        "Two or three channels working (portals + builder tie-ups + referrals)",
      system:
        "A system: portals + reels + builder tie-ups + investor WhatsApp groups running together",
      unclear:
        "Inconsistent — investors come, I don't know exactly how",
    },
  },

  q5_cpl: {
    question_text:
      "Roughly, what does it cost you to get one qualified lead (someone who actually books a site visit)?",
    helper:
      "Count site-visit-booked investors only — not raw 99acres clicks. Typical paid lead on Magicbricks/99acres is ₹500-5,000 per qualified lead.",
  },

  q6_conversion: {
    question_text:
      "Of every 10 investors who actually attend a site visit, roughly how many go on to book a unit?",
    helper:
      "Serious enquiry = attended site visit. Conversion = site visit to booking signed. Not portal enquiry to booking.",
  },

  q7_sales_cycle: {
    question_text:
      "From first site visit to brokerage hitting your bank account, how long does a typical deal take?",
    helper:
      "Clock to MONEY received, not booking signed. Cycle: site visit → booking → sale agreement → registration → brokerage paid. Registrations cancel often.",
  },

  q8_revenue_lakhs: {
    helper:
      "Total brokerage earned in last 12 months. Money actually received in bank, not committed-but-pending. 50 = ₹50 lakhs. 250 = ₹2.5 crore.",
  },

  q9_gross_margin: {
    question_text:
      "Of every ₹100 of brokerage, how much is left after the direct cost of closing that specific deal?",
    helper:
      "INCLUDE: pre-sale gifting, site-visit transport, legal/RERA verification, portal fees per closure. EXCLUDE: office rent, sales team salaries, marketing spend.",
  },

  q10_cash_runway: {
    helper:
      "Brokerage is lumpy — one dry quarter is normal. Fixed costs: office rent + sales team salaries + portal subs (99acres/Magicbricks) + RERA compliance + tax provisions.",
  },

  q11_owner_hours: {
    helper:
      "Include site visits, investor calls, builder meetings, NRI WhatsApp at odd hours, weekend showings. Be honest.",
  },

  q12_headcount: {
    helper:
      "Full-time sales team + ops + RERA/legal coordinator + you. Exclude part-time field agents on pure commission.",
  },

  q13_bottleneck: {
    question_text:
      "If you suddenly got 3x more serious investor enquiries tomorrow, what breaks first?",
    helper:
      "Think real broker constraints: builder pulling inventory, RERA verification queue, sales team capacity, cash to fund pre-sale gifting and portal spend.",
    option_labels: {
      owner_time:
        "My time — I personally handle every NRI / HNI relationship",
      team:
        "My team — not enough closers or skill to handle HNI conversations",
      systems:
        "My systems — we'd lose leads, miss follow-ups, drop investors between site visit and booking",
      cash:
        "My cash — I couldn't fund the gifting, transport, and portal spend spike",
      supply:
        "My supply — builders won't allocate enough inventory to me at that pace",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    option_labels: {
      energised: "Energised. I'm building a brokerage I love.",
      focused_tired:
        "Focused but tired. Lots of site visits and follow-ups, doing them.",
      drained:
        "Drained. Most days are firefighting cancellations and chasing brokerage.",
      done: "Done. I'm thinking about exiting broking.",
    },
  },

  q15_decision_making: {
    helper:
      "Investor relationships, builder negotiations, pricing on each deal — who calls the shots day-to-day?",
    option_labels: {
      only_me:
        "Only me. Every investor call and builder negotiation goes through me.",
      me_and_few: "Me and 1–2 trusted closers",
      team_decides:
        "Sales team handles most deals, I review the big-ticket ones",
      leadership_layer:
        "I have a sales head who runs the desk; I handle top investors only",
    },
  },

  q16_founder_age: {
    helper: "Your age in years.",
  },
  q17_marketing_spend: {
    helper:
      'Include 99acres/Magicbricks portal subscriptions, paid leads, builder marketing kickbacks, Instagram ads and NRI travel meetups. Brokerage CPLs run high — 10-25% of commission is common.',
  },

  q18_dso_days: {
    helper:
      "From sale-deed registration / payment milestone trigger to brokerage in your bank. Builders often pay 30-90 days post-registration; some stretch to 120+. Long DSO = you can't reinvest in next-quarter leads.",
  },
}
