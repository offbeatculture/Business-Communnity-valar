import type { VerticalQuestionOverlays } from "@/lib/audit/types"

// E-commerce / D2C — per-question overlay for the 7 Forces audit.
// Option `value` strings stay identical to the universal questions
// in lib/audit/questions.ts. Only labels and surrounding copy change.

export const ECOM_D2C_OVERLAYS: VerticalQuestionOverlays = {
  q1_icp_clarity: {
    question_text:
      "When you describe your brand to a stranger, who is the one buyer you're built for in one sentence?",
    helper:
      "Think persona: age, region, the problem your product solves, and why they'd reorder. Example: 'urban women 25-35 with acne-prone skin'.",
    option_labels: {
      specific:
        "I can name age, region, the problem, and the repeat-buying trigger",
      type_and_problem:
        "I can name the buyer type and the problem my product solves",
      type_only: "I can name a demographic only (age / gender / city)",
      anyone: "Honestly, I sell to anyone who'll check out",
    },
  },

  q2_xfactor_source: {
    question_text:
      "In your customers' own words — from reviews, DMs, or calls — why do they pick your brand over the other 50 on Meta?",
    helper:
      "Verbatim from reviews, WhatsApp messages, or post-purchase surveys. Not your packaging copy. Not what you assume.",
    option_labels: {
      verbatim:
        "I've read reviews and DMs and can quote 3+ buyers verbatim",
      asked_general:
        "I've skimmed reviews and have a general sense",
      assumed_generic:
        "I haven't asked, but I'm pretty sure it's price, quality, or ingredients",
      unknown: "I haven't asked. I don't really know.",
    },
  },

  q3_top3_concentration: {
    question_text:
      "What percentage of your revenue comes from your top 3 SKUs (products)?",
    helper:
      "SKU concentration, not customer. If one hero product is 50%+ and Meta nerfs that creative, the brand crashes. Enter 0–100.",
    format_hint: "Enter a number between 0 and 100.",
    unit: "%",
  },

  q4_lead_source: {
    helper:
      "Where most of your orders come from: Meta ads, Google Shopping, influencers, organic IG/YT, marketplaces (Amazon/Myntra), or repeat buyers.",
    option_labels: {
      wom_only: "Repeat buyers and referrals only",
      one_paid: "One paid channel working (usually Meta or Google)",
      multi_channel:
        "Two or three channels in parallel (Meta + Google + influencers)",
      system:
        "A system: paid + organic content + influencers + email/WhatsApp retention",
      unclear:
        "Inconsistent — orders come in, I don't know which channel did it",
    },
  },

  q5_cpl: {
    question_text:
      "Roughly, what does it cost you to acquire one new lead (add-to-cart or captured email/phone)?",
    helper:
      "Closest proxy to your blended CAC on new buyers. If you only track CAC on paid orders, divide ad spend by new customers and use that band.",
    unit: "₹",
  },

  q6_conversion: {
    question_text:
      "Of every 10 shoppers who initiate checkout (enter shipping details), roughly how many actually pay?",
    helper:
      "Checkout-initiated to paid order. Shopify calls this 'checkout completion rate'. Healthy D2C sits around 40-60%.",
  },

  q7_sales_cycle: {
    question_text:
      "From cart-add to money in the bank, how long does a typical order take?",
    helper:
      "For D2C this is usually minutes to hours. Pick 'same day' unless you sell high-ticket / made-to-order where buyers think for days.",
    option_labels: {
      same_day: "Same day — cart-add to paid in minutes",
      within_week: "Within a week (abandoned cart recovery brings them back)",
      "1_4_weeks": "1 – 4 weeks (high-ticket or considered purchase)",
      "1_3_months": "1 – 3 months (custom / made-to-order)",
      gt_3_months: "Over 3 months",
    },
  },

  q8_revenue_lakhs: {
    helper:
      "Top-line GMV across Shopify + marketplaces + offline in the last 12 months, before returns and discounts. Enter in lakhs.",
  },

  q9_gross_margin: {
    question_text:
      "Of every ₹100 of revenue, how much is left after COGS — product cost, packaging, shipping out, payment-gateway fee, and returns/RTO loss?",
    helper:
      "EXCLUDE ad spend (that's CAC, separate line), warehouse rent, and salaries. Many D2C founders mistakenly include ads here and post 10% — true gross margin is usually 30-60%.",
    unit: "%",
  },

  q10_cash_runway: {
    helper:
      "Fixed costs = warehouse rent + payroll + Shopify/tools subscriptions + interest on inventory loans. Excludes ad spend and COGS. How many months can cash on hand cover that?",
    unit: "months",
  },

  q11_owner_hours: {
    helper:
      "Total hours per week on the brand — ad creatives, supplier calls, ops fires, reviewing returns. Be honest, include nights and weekends.",
    unit: "hours",
  },

  q12_headcount: {
    helper:
      "Full-time only, including you. Count in-house ops, CX, performance marketing. Exclude freelance creators, agencies, and 3PL warehouse staff.",
    unit: "people",
  },

  q13_bottleneck: {
    question_text:
      "If a viral creative or influencer suddenly 3x'd your orders tomorrow, what breaks first?",
    option_labels: {
      owner_time: "My time — I'm already running ads, ops, and CX myself",
      team: "My team — CX queues blow up, ops can't pick-pack-ship that fast",
      systems:
        "My systems — Shopify/3PL/inventory sync drops orders or oversells",
      cash:
        "My cash — I can't fund the inventory and ad spend spike together",
      supply:
        "My supply — manufacturer MOQs and lead times can't keep up; ROAS collapses at scale",
      nothing: "Nothing breaks. We could absorb it.",
    },
  },

  q14_owner_energy: {
    option_labels: {
      energised: "Energised. I'm building a brand I love.",
      focused_tired:
        "Focused but tired. Ads, ops, returns — lots to do, doing it.",
      drained:
        "Drained. ROAS swings and RTO spikes make every day feel like firefighting.",
      done: "Done. I'm thinking about selling the brand or shutting it down.",
    },
  },

  q15_decision_making: {
    helper:
      "Day-to-day calls: ad spend allocation, new creatives, restocks, returns/RTO escalations, influencer briefs, pricing tweaks.",
    option_labels: {
      only_me: "Only me. No ad goes live and no PO gets placed without me.",
      me_and_few:
        "Me and 1–2 trusted people (usually a performance marketer or ops lead)",
      team_decides:
        "A team runs ads and ops; I review the big calls (new launches, big spend)",
      leadership_layer:
        "I have a leadership layer — marketing head + COO/ops head — running the brand",
    },
  },

  q16_founder_age: {
    helper: "Your age in years.",
    unit: "years",
  },
  q17_marketing_spend: {
    helper:
      'Include Meta + Google ads, influencer fees, affiliate payouts and any retained agency. D2C brands typically run 25-50% — paid acquisition is the engine. Below 15% usually means under-investing.',
  },

  q18_repeat_rate: {
    helper:
      "Of last 12 months' revenue, how much came from customers who had bought before? Strong D2C brands cross 40% repeat; weak ones live under 15% and burn fresh CAC every order.",
  },
}
