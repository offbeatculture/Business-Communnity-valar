// ════════════════════════════════════════════════════════════
// MANO MITRA AI — "Your Emotional Companion"
// Feel It. Locate It. Regulate It. Release It. Reconnect.
//
// Source: Dr Valarmathi's "Mano Mitra AI" specification.
//
// Deliberately NOT an LLM. Every line a member reads here was written
// by Dr Valar; the app only chooses which authored content to show.
// That keeps her teaching intact and makes the output predictable —
// which matters, because this feature invites people to open it while
// they are distressed.
//
// Pure + deterministic. No fetch, no model, no randomness.
// ════════════════════════════════════════════════════════════

export const PRODUCT_NAME = "Mano Mitra"
export const PRODUCT_TAGLINE = "Your emotional companion"
export const PRODUCT_STEPS = "Feel it. Locate it. Regulate it. Release it. Reconnect."

// ─── Step 1 · Safety check ──────────────────────────────────
// Runs before anything else and can end the session. Nothing about
// this screen is skippable.

export const SAFETY_QUESTION =
  "Before we continue, are you currently experiencing severe chest pain, difficulty breathing, fainting, sudden weakness or numbness, confusion, a sudden extremely painful headache, loss of vision, suicidal thoughts or an urge to harm yourself or somebody else?"

export const SAFETY_STOP_MESSAGE =
  "What you are describing needs immediate care from a person, not a breathing exercise. Please contact emergency services or a health professional now. This is the right and strong thing to do."

/** India-first, since the community is India-based. */
export const CRISIS_RESOURCES = [
  {
    name: "Emergency services",
    detail: "112 — police, fire, ambulance",
    number: "112",
  },
  {
    name: "Tele-MANAS",
    detail: "Government of India mental health support, 24×7",
    number: "14416",
  },
  {
    name: "AASRA",
    detail: "Suicide prevention helpline, 24×7",
    number: "9820466726",
  },
] as const

// ─── Chakras ────────────────────────────────────────────────

export const CHAKRA_KEYS = [
  "root",
  "sacral",
  "solar_plexus",
  "heart",
  "throat",
  "third_eye",
  "crown",
] as const

export type ChakraKey = (typeof CHAKRA_KEYS)[number]

export type Chakra = {
  key: ChakraKey
  name: string
  pattern: string
  related: string
  activityId: ActivityId
  breathId: BreathId
  accent: string
}

export const CHAKRAS: Record<ChakraKey, Chakra> = {
  root: {
    key: "root",
    name: "Root",
    pattern: "Fear",
    related: "Anxiety, insecurity, scarcity, hypervigilance",
    activityId: "five_point_grounding",
    breathId: "extended_exhalation",
    accent: "#B4532A",
  },
  sacral: {
    key: "sacral",
    name: "Sacral",
    pattern: "Guilt",
    related: "Shame, emotional suppression, lack of joy",
    activityId: "emotion_flow_journalling",
    breathId: "belly_breathing",
    accent: "#C97A3C",
  },
  solar_plexus: {
    key: "solar_plexus",
    name: "Solar Plexus",
    pattern: "Powerlessness",
    related: "Anger, frustration, self-doubt",
    activityId: "reclaiming_choice",
    breathId: "physiological_sigh",
    accent: "#C89B3C",
  },
  heart: {
    key: "heart",
    name: "Heart",
    pattern: "Grief",
    related: "Loss, loneliness, disconnection",
    activityId: "compassionate_connection",
    breathId: "coherent_breathing",
    accent: "#6F7358",
  },
  throat: {
    key: "throat",
    name: "Throat",
    pattern: "Suppressed expression",
    related: "Fear of speaking, resentment, unheard feelings",
    activityId: "unspoken_truth",
    breathId: "humming_exhalation",
    accent: "#4E7C8A",
  },
  third_eye: {
    key: "third_eye",
    name: "Third Eye",
    pattern: "Overthinking",
    related: "Worry, mental loops, uncertainty",
    activityId: "thought_versus_fact",
    breathId: "nadi_shuddhi",
    accent: "#5B5F92",
  },
  crown: {
    key: "crown",
    name: "Crown",
    pattern: "Loss of connection",
    related: "Emptiness, lack of meaning, disconnection",
    activityId: "seven_minutes_silence",
    breathId: "natural_observation",
    accent: "#7A5F91",
  },
}

/** Shown once, near the chakra naming — it is a reflective frame, not a claim. */
export const CHAKRA_DISCLAIMER =
  "This is a reflective spiritual framework — not proof that each emotion is physically stored in a particular chakra."

// ─── Step 2 · Emotions ──────────────────────────────────────

export type EmotionId =
  | "fear"
  | "guilt"
  | "shame"
  | "anger"
  | "anxiety"
  | "powerlessness"
  | "worry"
  | "overthinking"
  | "grief"
  | "loss_of_connection"
  | "lack_of_joy"
  | "unsure"

export type Emotion = {
  id: EmotionId
  label: string
  chakra: ChakraKey
  acknowledgementId: AcknowledgementId
}

export const EMOTIONS: Emotion[] = [
  { id: "fear", label: "Fear", chakra: "root", acknowledgementId: "fear" },
  { id: "guilt", label: "Guilt", chakra: "sacral", acknowledgementId: "guilt_shame" },
  { id: "shame", label: "Shame", chakra: "sacral", acknowledgementId: "guilt_shame" },
  { id: "anger", label: "Anger or frustration", chakra: "solar_plexus", acknowledgementId: "anger" },
  { id: "anxiety", label: "Anxiety", chakra: "root", acknowledgementId: "anxiety_worry" },
  { id: "powerlessness", label: "Powerlessness", chakra: "solar_plexus", acknowledgementId: "powerlessness" },
  { id: "worry", label: "Worry", chakra: "third_eye", acknowledgementId: "anxiety_worry" },
  { id: "overthinking", label: "Overthinking", chakra: "third_eye", acknowledgementId: "overthinking" },
  { id: "grief", label: "Grief", chakra: "heart", acknowledgementId: "grief" },
  { id: "loss_of_connection", label: "Loss of connection", chakra: "crown", acknowledgementId: "grief" },
  { id: "lack_of_joy", label: "Lack of joy", chakra: "sacral", acknowledgementId: "universal" },

  // The spec lists this option but does not map it to a chakra. Routed to
  // Root: five-point grounding is the one activity built for a state you
  // cannot name, and grounding is the safest default when the signal is
  // unclear. Flagged for Dr Valar to confirm.
  { id: "unsure", label: "I don't know what I'm feeling", chakra: "root", acknowledgementId: "universal" },
]

export const EMOTION_PROMPT = "What are you feeling most strongly right now?"

/** One primary emotion only — the spec is explicit that multi-select overwhelms. */
export function emotionById(id: string): Emotion | undefined {
  return EMOTIONS.find((e) => e.id === id)
}

export function chakraForEmotion(id: EmotionId): Chakra {
  return CHAKRAS[EMOTIONS.find((e) => e.id === id)!.chakra]
}

// ─── Step 3 · Body map ──────────────────────────────────────

export type BodyZoneId =
  | "head" | "face" | "throat" | "chest" | "upper_abdomen" | "lower_abdomen"
  | "lower_back" | "hips" | "arms" | "legs" | "whole_body" | "cannot_locate"

export const BODY_ZONES: { id: BodyZoneId; label: string }[] = [
  { id: "head", label: "Head or forehead" },
  { id: "face", label: "Face, jaw or eyes" },
  { id: "throat", label: "Throat or neck" },
  { id: "chest", label: "Chest or heart area" },
  { id: "upper_abdomen", label: "Upper abdomen" },
  { id: "lower_abdomen", label: "Lower abdomen or pelvis" },
  { id: "lower_back", label: "Lower back" },
  { id: "hips", label: "Hips" },
  { id: "arms", label: "Arms or hands" },
  { id: "legs", label: "Thighs, legs or feet" },
  { id: "whole_body", label: "Whole body" },
  { id: "cannot_locate", label: "I cannot locate it" },
]

export const SENSATIONS = [
  "Tight", "Heavy", "Hot", "Cold", "Restless", "Numb",
  "Painful", "Contracted", "Fluttering", "Tired", "Disconnected", "Something else",
] as const

export const BODY_PROMPT =
  "Where are you noticing this emotion or sensation in your body?"
export const SENSATION_PROMPT = "How does it feel?"

/** Required wording — the body map must not read as a diagnosis. */
export const BODY_DISCLAIMER =
  "The body area you select does not diagnose an emotion or medical condition. It simply helps you notice your present experience."

// ─── Step 4 · Intensity and context ─────────────────────────

export const TRIGGERS = [
  "Work pressure", "Relationship interaction", "Money concern", "Health symptom",
  "Family issue", "Comparison", "Fear of failure", "Feeling rejected",
  "Feeling unsupported", "Uncertain or unknown", "Other",
] as const

export const NEEDS = [
  "Safety", "Emotional release", "Clarity", "Courage",
  "Rest", "Connection", "Expression", "Hope",
] as const

export const INTENSITY_PROMPT = "How intense is it right now?"
export const TRIGGER_PROMPT = "What happened just before this feeling became stronger?"
export const NEED_PROMPT = "What do you need most right now?"

// ─── Migraine and headache route ────────────────────────────
// Triggered when the member locates the sensation in head/forehead.

export const MIGRAINE_RED_FLAGS = [
  "The pain began suddenly and became extremely severe",
  "This is my first severe headache, or different from my usual pattern",
  "I have weakness, numbness, confusion, speech difficulty or difficulty walking",
  "I have loss of vision, double vision or a seizure",
  "I have high fever, stiff neck, vomiting or strong light sensitivity",
  "The headache has persisted, worsened or repeatedly returned",
] as const

export const MIGRAINE_RED_FLAG_MESSAGE =
  "This experience needs medical assessment rather than an emotional-release exercise. Please seek urgent medical help. Do not perform Kapalabhati, breath retention or intense breathwork."

export const MIGRAINE_SAFE_GUIDANCE = [
  "Dim your screen and keep visuals still",
  "Natural breathing or a gentle extended exhalation only",
  "Drink water and keep your meals regular",
  "Note this episode in a headache diary",
  "Keep following the migraine plan your clinician approved",
] as const

export function needsMigraineTriage(zone: BodyZoneId | null): boolean {
  return zone === "head"
}

// ─── Step 5 · Activities ────────────────────────────────────

export type ActivityId =
  | "five_point_grounding"
  | "emotion_flow_journalling"
  | "reclaiming_choice"
  | "compassionate_connection"
  | "unspoken_truth"
  | "thought_versus_fact"
  | "seven_minutes_silence"

export type ActivityStep = {
  /** Something to do, no text entry. */
  instruction?: string
  /** A prompt the member writes into. */
  prompt?: string
  /** Renders as "____" fill-in wording. */
  completion?: string
}

export type Activity = {
  id: ActivityId
  chakra: ChakraKey
  title: string
  intro?: string
  steps: ActivityStep[]
  /** Two-column exercise (Third Eye). */
  columns?: [string, string]
  closingLabel: "Closing reframe" | "Closing action" | "Power statement"
  closing: string
  /** Extra safety wording shown with the activity. */
  note?: string
}

export const ACTIVITIES: Record<ActivityId, Activity> = {
  five_point_grounding: {
    id: "five_point_grounding",
    chakra: "root",
    title: "Five-Point Grounding",
    steps: [
      { instruction: "Place both feet on the ground." },
      { prompt: "Name five things you can see." },
      { prompt: "Name four things you can physically feel." },
      { prompt: "Name three things you can hear." },
      { completion: "The support available to me right now is" },
    ],
    closingLabel: "Closing reframe",
    closing:
      "Fear is asking for safety. You do not have to solve your entire future now. Find the next safe step.",
  },

  emotion_flow_journalling: {
    id: "emotion_flow_journalling",
    chakra: "sacral",
    title: "Emotion-Flow Journalling",
    steps: [
      { prompt: "What am I feeling guilty or ashamed about?" },
      { prompt: "What was I needing when this happened?" },
      { prompt: "What am I punishing myself for?" },
      { prompt: "What can I take responsibility for without attacking myself?" },
      { prompt: "What would healthy emotional movement look like today?" },
    ],
    closingLabel: "Closing action",
    closing: "Choose one gentle expression: cry, write, create, speak or move.",
  },

  reclaiming_choice: {
    id: "reclaiming_choice",
    chakra: "solar_plexus",
    title: "Reclaiming Choice",
    steps: [
      { prompt: "What is outside my control?" },
      { prompt: "What remains within my control?" },
      { prompt: "What boundary is required?" },
      { prompt: "What one decision can I make today?" },
    ],
    closingLabel: "Power statement",
    closing: "I may not control everything, but I am not without choice.",
    note:
      "For anger, add 60–90 seconds of safe stretching, shaking the arms or pressing the palms together — never hitting objects or forcing physical release.",
  },

  compassionate_connection: {
    id: "compassionate_connection",
    chakra: "heart",
    title: "Compassionate Connection",
    intro: "Place a hand over your chest.",
    steps: [
      { prompt: "What have I lost?" },
      { prompt: "What am I missing?" },
      { prompt: "What love still remains?" },
      { prompt: "Who is one safe person I can contact?" },
      { prompt: "Write three small things still supporting life today." },
    ],
    closingLabel: "Closing reframe",
    closing:
      "Grief does not mean love has disappeared. It means something meaningful has touched your life.",
  },

  unspoken_truth: {
    id: "unspoken_truth",
    chakra: "throat",
    title: "The Unspoken Truth",
    steps: [
      { completion: "What I wanted to say was" },
      { completion: "What I was afraid would happen if I said it" },
      { completion: "What I need people to understand" },
      { completion: "The respectful truth I can express now is" },
      { instruction: "You may record a private voice note without sending it." },
    ],
    closingLabel: "Closing action",
    closing: "Turn the emotional reaction into one clear request or boundary.",
  },

  thought_versus_fact: {
    id: "thought_versus_fact",
    chakra: "third_eye",
    title: "Thought Versus Fact",
    columns: ["What my mind is predicting", "What I actually know"],
    steps: [
      { prompt: "Is this a fact, fear or possibility?" },
      { prompt: "What evidence supports it?" },
      { prompt: "What evidence does not support it?" },
      { prompt: "What information do I still need?" },
      { prompt: "What decision can wait?" },
    ],
    closingLabel: "Closing reframe",
    closing: "Not every thought deserves a decision.",
  },

  seven_minutes_silence: {
    id: "seven_minutes_silence",
    chakra: "crown",
    title: "Seven Minutes of Silence",
    steps: [
      { instruction: "Sit comfortably." },
      { instruction: "Feel the body being supported." },
      { instruction: "Observe natural breathing." },
      { instruction: "Do not chase thoughts away." },
      { instruction: "When distracted, repeat: “Return.”" },
      { prompt: "What truly matters now?" },
      { prompt: "Choose one act of service." },
    ],
    closingLabel: "Closing reframe",
    closing:
      "Connection is not always something dramatic. Sometimes it begins when noise becomes quiet enough for truth to be heard.",
  },
}

// ─── Step 6 · Breathwork ────────────────────────────────────
// The spec calls these a "video library". Animated videos are still
// being sourced, so each pattern ships as a guided timer and carries an
// optional video slot to fill in later.

export type BreathId =
  | "extended_exhalation"
  | "belly_breathing"
  | "physiological_sigh"
  | "coherent_breathing"
  | "humming_exhalation"
  | "nadi_shuddhi"
  | "natural_observation"

export type BreathPhase = { label: string; seconds: number }

export type BreathPattern = {
  id: BreathId
  number: number
  name: string
  useFor: string
  /** Counted = cycle through phases. Timed = one long open period. */
  mode: "counted" | "timed"
  phases?: BreathPhase[]
  rounds?: number
  /** Timed patterns, in seconds. */
  duration?: number
  guidance: string
  safety?: string
  /** Filled in once the animated videos exist. */
  videoUrl?: string
}

export const BREATH_PATTERNS: Record<BreathId, BreathPattern> = {
  extended_exhalation: {
    id: "extended_exhalation",
    number: 1,
    name: "Extended Exhalation",
    useFor: "Fear, stress and mild anxiety",
    mode: "counted",
    phases: [
      { label: "Breathe in", seconds: 4 },
      { label: "Breathe out", seconds: 6 },
    ],
    rounds: 6,
    guidance:
      "If four and six feel difficult, shorten the counts. The breath must remain comfortable.",
  },

  belly_breathing: {
    id: "belly_breathing",
    number: 2,
    name: "Gentle Belly Breathing",
    useFor: "Guilt, shame and emotional contraction",
    mode: "timed",
    duration: 120,
    guidance:
      "Let the abdomen expand on a natural inhale, then let the exhale relax. No forcing the abdomen, no deep or rapid breathing.",
  },

  physiological_sigh: {
    id: "physiological_sigh",
    number: 3,
    name: "Physiological Sigh",
    useFor: "Acute frustration or emotional pressure",
    mode: "counted",
    phases: [
      { label: "Breathe in", seconds: 3 },
      { label: "Small second breath in", seconds: 1 },
      { label: "Long relaxed breath out", seconds: 6 },
    ],
    rounds: 3,
    guidance: "After this, return to natural breathing.",
  },

  coherent_breathing: {
    id: "coherent_breathing",
    number: 4,
    name: "Coherent Breathing",
    useFor: "Grief, loneliness and disconnection",
    mode: "counted",
    phases: [
      { label: "Breathe in", seconds: 5 },
      { label: "Breathe out", seconds: 5 },
    ],
    rounds: 15,
    guidance: "If five counts feel uncomfortable, use four and four.",
  },

  humming_exhalation: {
    id: "humming_exhalation",
    number: 5,
    name: "Humming Exhalation",
    useFor: "Suppressed expression and throat tension",
    mode: "counted",
    phases: [
      { label: "Breathe in naturally", seconds: 4 },
      { label: "Hum as you breathe out", seconds: 6 },
    ],
    rounds: 5,
    guidance: "Keep the hum comfortable, never forced.",
    safety:
      "Stop if humming aggravates ear, throat, head or respiratory symptoms.",
  },

  nadi_shuddhi: {
    id: "nadi_shuddhi",
    number: 6,
    name: "Gentle Nadi Shuddhi",
    useFor: "Worry and overthinking",
    mode: "counted",
    phases: [
      { label: "Left nostril in", seconds: 4 },
      { label: "Right nostril out", seconds: 4 },
      { label: "Right nostril in", seconds: 4 },
      { label: "Left nostril out", seconds: 4 },
    ],
    rounds: 8,
    guidance: "Alternate gently, without any retention.",
    safety:
      "This is a calming practice, not a treatment for migraine or neurological symptoms.",
  },

  natural_observation: {
    id: "natural_observation",
    number: 7,
    name: "Natural Breath Observation",
    useFor: "Disconnection, numbness or lack of meaning",
    mode: "timed",
    duration: 420,
    guidance:
      "No controlled breathing. Observe the breath and keep returning your attention to the body.",
  },
}

/**
 * Never auto-prescribed. Kapalabhati and breath retention can aggravate
 * dizziness, headache, panic and respiratory discomfort, and need
 * separate screening — so nothing in this flow can route to them.
 */
export const WITHHELD_TECHNIQUES = ["Kapalabhati", "Breath retention"] as const

// ─── Step 7 · Acknowledgements ──────────────────────────────

export type AcknowledgementId =
  | "universal" | "fear" | "guilt_shame" | "anger"
  | "anxiety_worry" | "powerlessness" | "grief" | "overthinking"

export const ACKNOWLEDGEMENTS: Record<AcknowledgementId, string> = {
  universal:
    "Beautiful. You paused, listened to your body and responded consciously instead of reacting automatically. That itself is a powerful shift. You do not have to solve everything today — carry this gentleness into your next small action. With love, Valar.",
  fear:
    "Your fear was not trying to defeat you; it was asking for protection. You have listened without allowing fear to control you. Take one safe, grounded step now.",
  guilt_shame:
    "You can take responsibility without punishing yourself. What happened may teach you, but it does not have to become your permanent identity. You are still worthy of compassion.",
  anger:
    "Your anger carries information about a need, hurt or boundary. You have created space between the emotion and your next action. Let clarity decide what happens next.",
  anxiety_worry:
    "You do not need the answer to every future question right now. Return to what is true, present and manageable. One conscious step is enough.",
  powerlessness:
    "You may not control the whole situation, but you still possess choice. Reclaim the smallest decision available to you and begin there.",
  grief:
    "There is no deadline for grief. Be gentle with the part of you that loved, hoped or lost. You deserve support while you carry this experience.",
  overthinking:
    "Your mind has been trying to create certainty through repetition. You can thank it and pause the loop. Not every thought requires analysis or action.",
}

// ─── Step 6b · Post-activity check ──────────────────────────

export type PostFeelingId =
  | "lighter" | "calmer" | "same" | "more_emotional" | "uncomfortable" | "need_support"

export const POST_FEELINGS: { id: PostFeelingId; label: string }[] = [
  { id: "lighter", label: "I feel lighter" },
  { id: "calmer", label: "I feel calmer" },
  { id: "same", label: "I feel the same" },
  { id: "more_emotional", label: "I feel more emotional" },
  { id: "uncomfortable", label: "I feel physically uncomfortable" },
  { id: "need_support", label: "I need human support" },
]

export type PostOutcome = {
  tone: "reinforce" | "offer_alternative" | "connect" | "stop"
  message: string
  /** Show crisis/professional-support resources alongside the message. */
  showSupport: boolean
}

/**
 * Post-check routing, straight from the spec's app logic.
 *
 * Note the deliberate omission: the AI must never tell someone their
 * emotion has been "completely released". Nothing here claims resolution.
 */
export function postOutcome(
  before: number,
  after: number,
  feeling: PostFeelingId,
  priorHighIntensitySessions = 0
): PostOutcome {
  if (feeling === "uncomfortable") {
    return {
      tone: "stop",
      message:
        "Stop the practice here. Physical discomfort is a signal to rest, not to push further. If it continues or worsens, please speak to a health professional.",
      showSupport: true,
    }
  }

  if (feeling === "need_support" || feeling === "more_emotional") {
    return {
      tone: "connect",
      message:
        "Let the breath stay natural now, and reach for a person rather than an exercise. Contact one safe person, or use the support below. Feeling more is not failure — it often means something real surfaced.",
      showSupport: true,
    }
  }

  // Repeatedly arriving at high intensity is the signal that this tool is
  // not the right level of care, regardless of how one session went.
  if (after >= 7 && priorHighIntensitySessions >= 2) {
    return {
      tone: "connect",
      message:
        "You have arrived here at a high intensity several times recently. That deserves steady, professional support alongside this practice — please consider speaking to a mental-health professional.",
      showSupport: true,
    }
  }

  if (before - after >= 2) {
    return {
      tone: "reinforce",
      message:
        "Something shifted. This activity is worth returning to — we have saved it for you.",
      showSupport: false,
    }
  }

  return {
    tone: "offer_alternative",
    message:
      "It has not moved much yet, and that is allowed. Try grounding, or come back to a gentler activity later. Nothing here needs to be finished today.",
    showSupport: false,
  }
}

export const POST_INTENSITY_PROMPT = "What is the intensity now?"

// ─── Completion ─────────────────────────────────────────────

export const COMPLETION_TITLE = "You completed your emotional check-in"

export const COMPLETION_CLOSING =
  "You have successfully completed today's Mano Mitra practice. Return whenever you need to pause, regulate and reconnect. You are also warmly invited to join the next live community session, where we practise these tools together."

// ─── Session shape ──────────────────────────────────────────

export type ManoMitraSession = {
  id: string
  user_id: string
  emotion_id: EmotionId
  chakra: ChakraKey
  body_zone: BodyZoneId | null
  sensation: string | null
  intensity_before: number
  intensity_after: number | null
  trigger: string | null
  need: string | null
  activity_id: ActivityId
  breath_id: BreathId
  post_feeling: PostFeelingId | null
  next_action: string | null
  /** Safety gate outcome — 'stopped' means the session ended at step 1. */
  safety_outcome: "cleared" | "stopped" | "migraine_flagged"
  completed_at: string | null
  created_at: string
}

/** Resolve the full route for a chosen emotion. */
export function routeFor(emotionId: EmotionId) {
  const chakra = chakraForEmotion(emotionId)
  return {
    chakra,
    activity: ACTIVITIES[chakra.activityId],
    breath: BREATH_PATTERNS[chakra.breathId],
    acknowledgement:
      ACKNOWLEDGEMENTS[emotionById(emotionId)!.acknowledgementId],
  }
}
