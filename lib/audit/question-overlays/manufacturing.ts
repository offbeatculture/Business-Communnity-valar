import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// Manufacturing / Trading — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const MANUFACTURING_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text:
      "When you describe your factory to a stranger, who is your one ideal buyer in one sentence?",
    helper:
      "Think industry + product fit + order volume + payment terms (advance, credit, LC). Example: auto-component OEMs placing ₹10L+ monthly POs on 60-day credit.",
    option_labels: {
      specific:
        "I can name the industry, product spec, order size, and payment terms",
      type_and_problem:
        "I can name the industry and the product problem I solve",
      type_only: "I can name an industry or buyer type only",
      anyone: "Honestly, I quote anyone who sends an RFQ",
    },
  },

  q2_xfactor_source: {
    question_text:
      "In your buyers' own words — not yours — why do they keep placing repeat POs with you over other vendors?",
    helper:
      "Procurement / purchase heads at your top OEM or distributor accounts. Not your sales guy's pitch. Reasons like consistent quality, on-time dispatch, credit terms, or jobwork flexibility.",
    option_labels: {
      verbatim:
        "I've asked procurement heads and can quote 3+ buyers verbatim",
      asked_general:
        "I've asked buyers and have a general sense of why they stay",
      assumed_generic:
        "I haven't asked, but I assume it's price, quality, or delivery time",
      unknown: "I haven't asked. I don't really know.",
    },
  },

  q3_top3_concentration: {
    helper:
      "Top 3 buyers (often OEMs or large distributors) as % of last 12 months revenue. This is the big risk in mfg — one OEM cuts the PO and the factory idles.",
  },

  q4_lead_source: {
    question_text: "Where do most of your RFQs and new buyers come from today?",
    helper:
      "RFQs you actually quoted on — not random IndiaMART spam. Channels: trade shows, references, IndiaMART/Alibaba, exports, OEM tie-ups, distributor network.",
    option_labels: {
      wom_only: "References and existing buyer pull-through only",
      one_paid:
        "One channel working (IndiaMART, Alibaba, trade show, or export agent)",
      multi_channel:
        "Two or three channels (e.g. IndiaMART + trade shows + distributors)",
      system:
        "A system: trade shows + listings + outbound + distributor network running together",
      unclear: "Inconsistent — RFQs come, I don't know exactly how",
    },
  },

  q5_cpl: {
    question_text:
      "Roughly, what does it cost you to get one serious RFQ (a buyer who actually wants a quote)?",
    helper:
      "A lead = an RFQ you quoted on, not every IndiaMART enquiry. Include IndiaMART subscription, trade show booth cost, sample courier, export agent fee divided by RFQs received.",
    option_labels: {
      lt_100: "Under ₹100 per RFQ",
      "100_500": "₹100 – ₹500 per RFQ",
      "500_2000": "₹500 – ₹2,000 per RFQ",
      "2000_10000": "₹2,000 – ₹10,000 per RFQ",
      gt_10000: "Over ₹10,000 per RFQ",
      untracked: "I don't track this",
    },
  },

  q6_conversion: {
    question_text:
      "Of every 10 serious RFQs (where buyer asked for sample, spec sheet, or factory visit), how many turn into actual POs?",
    helper:
      "Serious = buyer asked for sample, spec sheet, or factory visit. Not casual price-checks. Count converts as first PO issued, not just verbal interest.",
  },

  q7_sales_cycle: {
    question_text:
      "From first RFQ to first payment received against a PO, how long does a typical new buyer take?",
    helper:
      "RFQ → sample approval → PO → first dispatch → payment received. Industrial buyers often run 1-6 months. Exports and OEM tie-ups can stretch longer.",
  },

  q8_revenue_lakhs: {
    helper:
      "Top line (dispatched value / invoiced sales) for the last 12 months, before GST. Include exports. 50 = ₹50 lakhs. 250 = ₹2.5 crore.",
  },

  q9_gross_margin: {
    question_text:
      "Of every ₹100 of revenue, how much is left after the direct per-unit cost of making the goods?",
    helper:
      "Include only: raw material + direct labor + utilities + packaging + freight-out. EXCLUDE supervisor salaries, sales/office salaries, machinery EMIs, rent, depreciation, interest — those are OpEx, not COGS.",
    option_labels: {
      gt_70: "₹70 – ₹100 left (70%+ margin) — rare in mfg, double-check",
      "50_70": "₹50 – ₹70 left (50–70% margin)",
      "30_50": "₹30 – ₹50 left (30–50% margin)",
      "15_30": "₹15 – ₹30 left (15–30% margin) — typical healthy band",
      lt_15: "Under ₹15 left (under 15% margin)",
      untracked: "I don't track this",
    },
  },

  q10_cash_runway: {
    question_text:
      "If dispatches stopped today, how many months could you cover fixed costs from cash on hand plus undrawn working capital limit?",
    helper:
      "Fixed = office/supervisor/sales salaries + machinery EMIs + rent + factory overheads + WC loan interest. Don't count stuck receivables as cash.",
  },

  q11_owner_hours: {
    helper:
      "Time on the shop floor, vendor calls, buyer visits, WhatsApp groups, dispatch follow-ups. Include evenings and weekends. Be honest.",
  },

  q12_headcount: {
    question_text:
      "How many full-time people work in the business including factory, office, and you?",
    helper:
      "Include shop floor workers, supervisors, QC, dispatch, office staff, and you. Exclude contract jobwork labor paid per piece.",
  },

  q13_bottleneck: {
    question_text:
      "If a buyer placed a PO 3x your current monthly capacity tomorrow, what breaks first?",
    helper:
      "Think through: raw material availability, skilled labor, machine capacity, working capital for inventory, or your own time signing every approval.",
    option_labels: {
      owner_time: "My time — every PO, sample, and dispatch needs my sign-off",
      team: "My team — not enough skilled operators or a real GM",
      systems:
        "My systems — we'd miss dispatches, slip on QC, lose track of WIP",
      cash:
        "My cash — I can't fund the raw material and WIP for that volume",
      supply:
        "My supply — raw material or machine capacity can't scale that fast",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    option_labels: {
      energised: "Energised. I'm building a real manufacturing business.",
      focused_tired:
        "Focused but tired. Shop floor, buyers, receivables — pushing through.",
      drained:
        "Drained. Most days are firefighting — labor, raw material, payments stuck.",
      done: "Done. I'm thinking about selling the unit or exiting.",
    },
  },

  q15_decision_making: {
    helper:
      "Mfg is usually family-driven — founder + son/brother + GM. Layered orgs are rare below ₹50Cr. Think purchase, production, dispatch, payment decisions.",
    option_labels: {
      only_me: "Only me. No PO, payment, or dispatch moves without me.",
      me_and_few: "Me and 1–2 family members or a trusted GM",
      team_decides:
        "A GM and function heads decide; I review big POs and capex",
      leadership_layer:
        "I have a leadership layer (GM, plant head, accounts head) running operations",
    },
  },

  q16_founder_age: {
    helper: "Your age in years today.",
  },
  q17_marketing_spend: {
    helper:
      'Include trade-show booths, IndiaMART premium, B2B sales team salaries, sample shipping and brochures. Most SME manufacturers run 2-8% — relationship and OEM-driven, not ad-driven.',
  },

  q18_dso_days: {
    helper:
      'From dispatch / GST invoice to money in bank, averaged across your top buyers. OEM clients often pay 60-90 days. Long DSO + working-capital loans means margin gets eaten by interest.',
  },
}
