// ════════════════════════════════════════════════════════════
// The Panchakosha Programme — five weekly sessions
//
// Source: Dr Valarmathi's "Panchakosha Video Scripts & Activities".
// One 10-minute video and 10 activities per kosha, one kosha per week.
//
// The recordings do not exist yet, so each week carries a `videoUrl`
// slot to fill in later. Everything else here is her written material.
// ════════════════════════════════════════════════════════════

import { KOSHA_KEYS, KOSHAS, type KoshaKey } from "@/lib/kosha"

export type KoshaWeek = {
  key: KoshaKey
  week: number
  name: string
  sheath: string
  /** One line on what this session is for. */
  summary: string
  /** The teaching beats from her 10-minute script. */
  teaches: string[]
  /** The live practice moment in the session. */
  practice: string
  activities: string[]
  /**
   * Object key inside the private `panchakosha` Supabase bucket.
   * Not a URL — the page requests /api/panchakosha/video/[kosha], which
   * checks access and redirects to a short-lived signed URL.
   */
  videoPath?: string
  /** The recording's own title, which differs from the kosha name. */
  videoTitle?: string
  durationMinutes: number
}

export const KOSHA_WEEKS: KoshaWeek[] = [
  {
    key: "annamaya",
    week: 1,
    name: KOSHAS.annamaya.name,
    sheath: KOSHAS.annamaya.sheath,
    summary:
      "The layer everyone touches daily but rarely thinks of as spiritual — the physical body.",
    teaches: [
      "Annamaya Kosha, the Food Sheath — the densest, outermost of the five layers",
      "Your flesh, bones and tissue are literally built from the food you eat",
      "We start here because it is the most tangible layer — easiest to feel, easiest to begin healing",
      "Imbalance shows up as lower back pain, tight or stiff legs, constant fatigue, irregular eating",
      "This is not laziness or a character flaw — it is a body starved of rhythm and grounding",
      "The deeper layers cannot be reached while this foundation stays in distress",
    ],
    practice:
      "Grounding: stand barefoot, feet flat, no phone, for one to two minutes.",
    activities: [
      "Grounding practice — 5–10 minutes barefoot on natural ground, daily",
      "Fixed meal timing — dinner finished 2–3 hours before sleep, no skipped meals",
      "Daily 15–20 minute outdoor walk",
      "Hydration check-in — log minimum water intake each day",
      "Swap one processed snack for a whole-food option daily",
      "10-minute gentle mobility routine for lower back, hips and legs",
      "Digital sunset — no screens 1 hour before bed",
      "Consistent sleep and wake time for the full week",
      "Body-scan journal — note where physical tightness shows up each day",
      "Balanced-plate check — protein and fibre at each main meal",
    ],
    videoPath: "annamaya.mp4",
    videoTitle: "Annamaya Kosha - From Project to Partnership",
    durationMinutes: 10,
  },

  {
    key: "pranamaya",
    week: 2,
    name: KOSHAS.pranamaya.name,
    sheath: KOSHAS.pranamaya.sheath,
    summary:
      "One layer deeper than the body — the breath, and the life-force it carries.",
    teaches: [
      "Prana is life-force energy carried through 72,000 nadis — 36,000 on each side",
      "These pathways are thinner than a strand of hair; only breath can reach and clear them",
      "Balloon breathing is diaphragmatic breathing with real resistance",
      "4-7-8 breathing — four in, seven hold, eight out — is the emergency reset",
      "Two nervous-system pedals: right side is the accelerator, left side is the brake",
      "Lowers blood pressure in minutes, strengthens the vagus nerve, builds CO₂ tolerance",
    ],
    practice: "One full round of 4-7-8, counted out loud together.",
    activities: [
      "Balloon breathing — minimum 5 balloons daily",
      "4-7-8 breathing — 3 rounds, 3 times a day",
      "Diaphragmatic breathing — hand on belly, 5 minutes, morning",
      "Vagus nerve neck rotation — 3× each direction, twice daily",
      "Alternate-nostril breathing (Nadi Shodhana) — 5 minutes daily",
      "Extended-exhale practice — exhale twice as long as inhale, 5 rounds",
      "Breath-hold capacity building — timed holds, gradually increasing by 1–2 counts",
      "In-the-moment tool: mouth-exhale immediately during any stress spike",
      "Morning 3-minute breath reset before checking the phone",
      "Weekly self-check: note resting heart rate or BP before and after a 4-7-8 session",
    ],
    videoPath: "pranamaya.mp4",
    videoTitle: "Moving Inward The Pranamaya Kosha",
    durationMinutes: 10,
  },

  {
    key: "manomaya",
    week: 3,
    name: KOSHAS.manomaya.name,
    sheath: KOSHAS.manomaya.sheath,
    summary:
      "The layer most people never learn to address directly — beliefs, thought patterns, behaviour.",
    teaches: [
      "Change the belief and the behaviour, and the results in life change",
      "The five root anxiety patterns: inherited, survival, scarcity, belonging, ungrounded",
      "Anavam — the contraction of the self, how challenges shrink us from our original openness",
      "Anxiety is outdated software installed by earlier generations, not a personal flaw",
      "You are not your anxiety — it is protective intelligence that can now be thanked and released",
    ],
    practice:
      "Picture the anxiety as an external presence, thank it, then release it: “Thank you for protecting me. I am safe now. Today, you can rest.”",
    activities: [
      "Daily journaling — one page naming today's dominant emotion",
      "Lam Bija mantra practice — 3 minutes daily, exhaling on the chant",
      "Anxiety-pattern identification exercise — revisit and re-score monthly",
      "Visualisation and release practice — give the anxiety a face, thank it, release it",
      "Thought-labelling — catch and name one automatic negative thought per day",
      "“Outdated software” reframe — write one inherited belief and where it came from",
      "Affirmation practice — 3 repetitions, morning and night",
      "Weekly community share — verbalise one emotional pattern noticed this week",
      "Boundary practice — hold one small boundary this week and note how it felt",
      "Gratitude and release journaling before bed",
    ],
    videoPath: "manomaya.mp4",
    videoTitle: "The Interpreter Within",
    durationMinutes: 10,
  },

  {
    key: "vijnanamaya",
    week: 4,
    name: KOSHAS.vijnanamaya.name,
    sheath: KOSHAS.vijnanamaya.sheath,
    summary:
      "Beyond managing emotions — identity itself, and the wisdom that discerns.",
    teaches: [
      "The gap this layer addresses: “things changed on the outside, but I still can't change myself”",
      "The difference between symptom relief and identity-level change",
      "This layer takes real time — like a full-term pregnancy, it cannot be rushed without an incomplete result",
      "This week is an introduction and a beginning, not a finish line",
    ],
    practice:
      "Guided reflection: “Who am I becoming — not just what am I fixing?” Then name three values aloud.",
    activities: [
      "Weekly identity journaling — “who am I becoming this month?”",
      "Values clarification — list and rank your top 5 personal values",
      "Decision review — make one decision from intuition rather than fear, then reflect",
      "Community discussion — share one personal insight with the group",
      "Reflect on one wisdom teaching or quote for the week",
      "10-minute silent, unguided reflection or meditation",
      "Life-pattern mapping — note one repeating pattern and its likely root",
      "“Future self” letter — write to yourself one year from now",
      "Weekly review — what shifted across the month's activities so far",
      "Identify and practise one small identity-level change this week",
    ],
    videoPath: "vijnanamaya.mp4",
    videoTitle: "Soul-Conscious Living",
    durationMinutes: 10,
  },

  {
    key: "anandamaya",
    week: 5,
    name: KOSHAS.anandamaya.name,
    sheath: KOSHAS.anandamaya.sheath,
    summary:
      "Not a technique — what is left once the other four layers are less blocked.",
    teaches: [
      "The goal was never just symptom relief — it is a return to joy",
      "Bliss is not chased directly; it emerges once the other layers clear",
      "The shift from studying my symptoms to actually enjoying my life",
      "This is the layer that shows whether the month's work became real, felt change",
    ],
    practice:
      "Guided gratitude and savouring — three things you are grateful for right now. Then smile, laugh or move for one minute, with no goal attached.",
    activities: [
      "Daily gratitude list — 3 items, morning or night",
      "Joy audit — note one moment of genuine joy each day",
      "15–20 minute play or creativity block, purely for fun",
      "Community celebration share — post one win in the group weekly",
      "20 minutes outdoors with no task attached",
      "1-hour daily digital detox block",
      "10-minute music or movement break, no goal, just enjoyment",
      "One small random act of kindness this week",
      "Savouring practice — one meal eaten fully present, no distractions",
      "Month-end reflection and celebration ritual — review growth across all 5 weeks",
    ],
    videoPath: "anandamaya.mp4",
    videoTitle: "The Bliss Sheath Finding Fulfillment Beyond Achievement",
    durationMinutes: 10,
  },
]

export function koshaWeekByKey(key: string): KoshaWeek | undefined {
  return KOSHA_WEEKS.find((w) => w.key === key)
}

export const TOTAL_ACTIVITIES = KOSHA_WEEKS.reduce(
  (sum, w) => sum + w.activities.length,
  0
)

/** Sanity guard — the programme is defined as five weeks, one per kosha. */
export const WEEKS_COMPLETE = KOSHA_WEEKS.length === KOSHA_KEYS.length
