// Scale Code — Business Assessment Scoring Engine
// All constants and pure functions. Client-safe (no server imports).

export const PILLAR_KEYS = ["offer", "leads", "conversion", "ops", "team", "money", "moat", "retention"] as const
export type PillarKey = (typeof PILLAR_KEYS)[number]

export const PILLAR_NAMES: Record<PillarKey, string> = {
  offer: "Offer Engine",
  leads: "Lead Machine",
  conversion: "Conversion System",
  ops: "Ops Blueprint",
  team: "A-Team",
  money: "Money Map",
  moat: "The Moat",
  retention: "Retention Loop",
}

export const STAGES = [
  "Zero to One",
  "First Blood",
  "Solo Ceiling",
  "Crore Chase",
  "Real Business",
  "The Machine",
  "Empire Mode",
] as const

export const STAGE_REVENUE = [
  "\u20b90 \u2013 \u20b91 lakh/year",
  "\u20b91 lakh \u2013 \u20b910 lakh/year",
  "\u20b910 lakh \u2013 \u20b950 lakh/year",
  "\u20b950 lakh \u2013 \u20b91 crore/year",
  "\u20b91 crore \u2013 \u20b93 crore/year",
  "\u20b93 crore \u2013 \u20b95 crore/year",
  "\u20b95 crore \u2013 \u20b910 crore+/year",
]

// PRIORITY_MATRIX[pillarIndex][stageIndex] → priority
export const PRIORITY_MATRIX = [
  ["CRITICAL", "CRITICAL", "HIGH", "HIGH", "MAINTAIN", "MAINTAIN", "OPTIMIZE"],
  ["HIGH", "CRITICAL", "CRITICAL", "CRITICAL", "HIGH", "MAINTAIN", "OPTIMIZE"],
  ["LOW", "HIGH", "HIGH", "CRITICAL", "HIGH", "MAINTAIN", "OPTIMIZE"],
  ["IGNORE", "LOW", "HIGH", "HIGH", "CRITICAL", "CRITICAL", "MAINTAIN"],
  ["IGNORE", "IGNORE", "MEDIUM", "HIGH", "CRITICAL", "CRITICAL", "HIGH"],
  ["LOW", "MEDIUM", "HIGH", "CRITICAL", "CRITICAL", "CRITICAL", "CRITICAL"],
  ["IGNORE", "LOW", "LOW", "MEDIUM", "HIGH", "CRITICAL", "CRITICAL"],
  ["LOW", "MEDIUM", "MEDIUM", "HIGH", "HIGH", "HIGH", "CRITICAL"],
] as const

// Tiebreaker: Offer > Leads > Conversion > MoneyMap > Ops > Team > Moat > Retention
const TIEBREAKER_ORDER = [0, 1, 2, 5, 3, 4, 6, 7]

export const ARCHETYPE_STORIES: Record<string, string> = {
  Hustler: "Can sell, backend is chaos. Revenue grows, stress grows faster.",
  Perfectionist: "Incredible work, nobody knows you exist. Best-kept secret.",
  "Offer Genius": "Special product, can\u2019t distribute. Product ahead of distribution.",
  "One-Person Army": "Everything works because of YOU. High-paying job, not a business.",
  "Revenue Trap": "Money in, money vanishes. Busy and broke.",
  Builder: "Balanced, nothing excellent. Pick one pillar to dominate.",
  "Builder-starter": "You\u2019re at the starting line. That\u2019s not a weakness \u2014 it\u2019s clarity. Pick the pillar that unlocks everything else, and go all-in.",
  "Builder-elite": "Strong foundation across the board. Your move now isn\u2019t to fix \u2014 it\u2019s to pick one pillar to go from good to elite.",
}

export const ARCHETYPE_CONTEXT: Record<string, string> = {
  Hustler: "This is the classic Hustler trap. You can sell \u2014 that\u2019s not the problem. The problem is everything behind the sale runs on adrenaline. Your sales skills got you here. Systems get you past here.",
  Perfectionist: "Perfectionists build beautiful things nobody sees. Your ops and retention scores are strong. But delivery without distribution is a hobby. The hardest shift for you isn\u2019t building a lead system. It\u2019s accepting that a \u201cgood enough\u201d lead system running daily beats a perfect one you\u2019re still designing.",
  "Offer Genius": "You\u2019ve built something special \u2014 a product or service that genuinely stands apart. But the market doesn\u2019t know it yet. Your bottleneck isn\u2019t quality. It\u2019s reach.",
  "One-Person Army": "You\u2019re competent across the board \u2014 that\u2019s rare. But competence without delegation is a trap. You don\u2019t have a business problem. You have a trust problem.",
  "Revenue Trap": "Revenue Trap founders look successful from the outside. The revenue is real. The profit isn\u2019t. The fix isn\u2019t more revenue. It\u2019s knowing your unit economics cold.",
  Builder: "You\u2019re building from a balanced position \u2014 no catastrophic weaknesses, no dominant strengths. Your next move is to pick one pillar and go deep. Generalist founders plateau. Specialists break through.",
  "Builder-starter": "Every pillar is at the starting line. That\u2019s not overwhelm \u2014 it\u2019s simplicity. You don\u2019t have eight fires to fight. You have one decision to make: which pillar, fixed first, unlocks the most movement everywhere else.",
  "Builder-elite": "You\u2019ve built strong foundations everywhere. That\u2019s rare. The temptation now is to maintain. Resist it. Good everywhere is a plateau. Pick the one pillar where good-to-great would 2x your business.",
}

export const RECOMMENDATIONS: Record<string, Record<string, string>> = {
  offer: {
    Early: "Your Offer Engine is your floor. You\u2019re selling time, not a solution. Pick one specific outcome you deliver, price it as a package, and stop customizing proposals for every lead.",
    Mid: "Your Offer Engine is your floor. Your offer got you here, but it doesn\u2019t scale \u2014 every project is custom, margins are thin. Restructure into 2-3 tiers with clear deliverables.",
    Late: "Your Offer Engine is your floor. At your revenue, a weak offer means your sales team is compensating with hustle. Audit your offer against the top 3 competitors and rebuild the value stack.",
  },
  leads: {
    Early: "Your Lead Machine is your floor. You don\u2019t have a lead problem \u2014 you have an invisibility problem. Pick one channel, post or reach out daily for 90 days, and measure responses.",
    Mid: "Your Lead Machine is your floor. You\u2019re getting leads, but it\u2019s inconsistent \u2014 feast or famine. Build one repeatable system that generates leads without you being in every conversation.",
    Late: "Your Lead Machine is your floor. At \u20b91Cr+, single-channel dependency is a structural risk. Diversify into 2-3 acquisition channels and hire someone to own each one.",
  },
  conversion: {
    Early: "Your Conversion System is your floor. Conversations happen, but nobody buys. Write down your exact sales process, step by step, and find where people drop off. Fix that one step.",
    Mid: "Your Conversion System is your floor. Leads come in, but your close rate is unpredictable. Script your sales process, track every stage, and find the single biggest drop-off point.",
    Late: "Your Conversion System is your floor. Win rates vary by rep, nobody follows the same process. Build a sales playbook, train to it weekly, and make your best closer\u2019s process the default.",
  },
  ops: {
    Early: "Your Ops Blueprint is your floor. You\u2019re delivering everything from memory. Document the one process you repeat most often. That single document is your first system.",
    Mid: "Your Ops Blueprint is your floor. Your business runs on your memory and energy. Document your top 5 recurring processes, assign ownership for each, and stop being the single point of failure.",
    Late: "Your Ops Blueprint is your floor. At \u20b91Cr+, broken ops means invisible margin leaks. Audit your delivery pipeline, find the three costliest bottlenecks, and automate or delegate them.",
  },
  team: {
    Early: "Your A-Team is your floor. Don\u2019t hire for capacity yet. Find one contractor for your weakest skill and test the relationship for 90 days.",
    Mid: "Your A-Team is your floor. You\u2019re still making every decision yourself \u2014 that\u2019s a job with extra steps. Make your first real hire in the area that drains your energy most.",
    Late: "Your A-Team is your floor. You have people, but they wait for you. Define decision rights: what they can decide without you, what needs your input, what needs your approval.",
  },
  money: {
    Early: "Your Money Map is your floor. You don\u2019t know your real numbers. Track three numbers this month: revenue, costs, and what\u2019s left. That\u2019s your starting point.",
    Mid: "Your Money Map is your floor. Revenue grows, bank balance doesn\u2019t. Break every rupee into cost of delivery, operating costs, and profit. If profit isn\u2019t at least 20%, your pricing or delivery model is broken.",
    Late: "Your Money Map is your floor. At \u20b91Cr+, financial blindness looks like growth that feels fragile. You need unit economics per service line, cash flow forecasting, and a finance person who challenges your spending.",
  },
  moat: {
    Early: "Your Moat is your floor. You\u2019re competing on price because nothing else differentiates you. Find one thing you do that others can\u2019t easily copy and start building it now.",
    Mid: "Your Moat is your floor. Competitors can replicate everything you do within 90 days. Build switching costs into your service: custom integrations, embedded workflows, anything that makes leaving painful.",
    Late: "Your Moat is your floor. At your scale, commoditization is an existential threat. Build structural advantages: proprietary technology, exclusive partnerships, or a brand so strong clients pay a premium.",
  },
  retention: {
    Early: "Your Retention Loop is your floor. Old clients don\u2019t come back, and acquisition costs eat your margin. Ask your last 10 clients why they didn\u2019t buy again. The answer is your retention strategy.",
    Mid: "Your Retention Loop is your floor. You\u2019re spending all energy on acquisition while ignoring clients who already trust you. Build one re-engagement touchpoint: a check-in sequence, a renewal offer, or a referral program.",
    Late: "Your Retention Loop is your floor. At \u20b91Cr+, every lost client costs 5-7x what it costs to keep them. Build a retention dashboard: track engagement signals, flag at-risk accounts monthly, assign someone to own renewals.",
  },
}

// ── Scoring functions ──

function getTier(stageIndex: number): "Early" | "Mid" | "Late" {
  if (stageIndex <= 1) return "Early"
  if (stageIndex <= 3) return "Mid"
  return "Late"
}

export type PillarScores = Record<PillarKey, number>

export type ArchetypeResult = {
  name: string
  variant: string | null
  story: string
  context: string
}

export type FloorResult = {
  pillarKey: PillarKey
  pillarName: string
  score: number
  priority: string
}

export type ScaleCodeResult = {
  pillars: PillarScores
  floor: FloorResult
  archetype: ArchetypeResult
  stage: string
  stageIndex: number
  stageRevenue: string
  tier: "Early" | "Mid" | "Late"
  recommendation: string
  priorities: Record<PillarKey, string>
}

export function detectArchetype(scores: number[]): ArchetypeResult {
  const [offer, leads, conversion, ops, team, money, moat, retention] = scores

  // Edge cases
  if (scores.every((s) => s <= 4)) {
    return {
      name: "The Builder",
      variant: "starter",
      story: ARCHETYPE_STORIES["Builder-starter"],
      context: ARCHETYPE_CONTEXT["Builder-starter"],
    }
  }
  if (scores.every((s) => s >= 8)) {
    return {
      name: "The Builder",
      variant: "elite",
      story: ARCHETYPE_STORIES["Builder-elite"],
      context: ARCHETYPE_CONTEXT["Builder-elite"],
    }
  }
  if (scores.every((s) => s === scores[0])) {
    return { name: "The Builder", variant: null, story: ARCHETYPE_STORIES.Builder, context: ARCHETYPE_CONTEXT.Builder }
  }

  // Priority 1: Revenue Trap
  if (offer >= 7 && leads >= 7 && conversion >= 7 && money <= 4) {
    return { name: "The Revenue Trap", variant: null, story: ARCHETYPE_STORIES["Revenue Trap"], context: ARCHETYPE_CONTEXT["Revenue Trap"] }
  }

  // Priority 2: One-Person Army
  if (team <= 4) {
    const othersAbove5 = [offer, leads, conversion, ops, money, moat, retention].filter((s) => s >= 5).length
    if (othersAbove5 >= 4) {
      return { name: "The One-Person Army", variant: null, story: ARCHETYPE_STORIES["One-Person Army"], context: ARCHETYPE_CONTEXT["One-Person Army"] }
    }
  }

  // Priority 3: Hustler
  if (leads >= 7 && conversion >= 7 && ops <= 4 && team <= 4) {
    return { name: "The Hustler", variant: null, story: ARCHETYPE_STORIES.Hustler, context: ARCHETYPE_CONTEXT.Hustler }
  }

  // Priority 4: Perfectionist
  if (ops >= 7 && retention >= 7 && leads <= 4 && moat <= 4) {
    return { name: "The Perfectionist", variant: null, story: ARCHETYPE_STORIES.Perfectionist, context: ARCHETYPE_CONTEXT.Perfectionist }
  }

  // Priority 5: Offer Genius
  if (offer >= 7 && moat >= 7 && leads <= 4 && conversion <= 4) {
    return { name: "The Offer Genius", variant: null, story: ARCHETYPE_STORIES["Offer Genius"], context: ARCHETYPE_CONTEXT["Offer Genius"] }
  }

  // Fallback: closest match or Builder
  return closestMatchFallback(scores)
}

function closestMatchFallback(scores: number[]): ArchetypeResult {
  const team = scores[4]

  const archetypes = [
    { name: "The Revenue Trap", key: "Revenue Trap", type: "standard" as const, highPillars: [0, 1, 2], lowPillars: [5] },
    { name: "The One-Person Army", key: "One-Person Army", type: "army" as const, highPillars: [] as number[], lowPillars: [] as number[] },
    { name: "The Hustler", key: "Hustler", type: "standard" as const, highPillars: [1, 2], lowPillars: [3, 4] },
    { name: "The Perfectionist", key: "Perfectionist", type: "standard" as const, highPillars: [3, 7], lowPillars: [1, 6] },
    { name: "The Offer Genius", key: "Offer Genius", type: "standard" as const, highPillars: [0, 6], lowPillars: [1, 2] },
  ]

  let bestKey = "Builder"
  let bestName = "The Builder"
  let bestNormalized = 0

  for (const arch of archetypes) {
    let normalized = 0

    if (arch.type === "standard") {
      let highScore = 0
      let lowScore = 0
      for (const pi of arch.highPillars) {
        if (scores[pi] >= 7) highScore += 1.0
        else if (scores[pi] >= 5) highScore += 0.5
      }
      for (const pi of arch.lowPillars) {
        if (scores[pi] <= 4) lowScore += 1.0
        else if (scores[pi] <= 6) lowScore += 0.5
      }
      const highFraction = highScore / arch.highPillars.length
      const lowFraction = lowScore / arch.lowPillars.length
      normalized = highFraction * lowFraction
    } else {
      // One-Person Army
      if (team > 6) continue
      let fitScore = 0
      if (team <= 4) fitScore += 2.0
      else if (team <= 6) fitScore += 1.0
      for (let i = 0; i < 8; i++) {
        if (i === 4) continue
        if (scores[i] >= 5) fitScore += 0.5
      }
      normalized = fitScore / 6.5
    }

    if (normalized > bestNormalized) {
      bestNormalized = normalized
      bestName = arch.name
      bestKey = arch.key
    }
  }

  if (bestNormalized < 0.4) {
    return { name: "The Builder", variant: null, story: ARCHETYPE_STORIES.Builder, context: ARCHETYPE_CONTEXT.Builder }
  }

  return { name: bestName, variant: null, story: ARCHETYPE_STORIES[bestKey], context: ARCHETYPE_CONTEXT[bestKey] }
}

export function detectFloor(pillarScores: number[], stageIndex: number): FloorResult {
  const eligible: { pillarIndex: number; score: number; priority: string; tiebreakerRank: number }[] = []

  for (let i = 0; i < 8; i++) {
    const priority = PRIORITY_MATRIX[i][stageIndex]
    if (priority === "CRITICAL" || priority === "HIGH") {
      eligible.push({
        pillarIndex: i,
        score: pillarScores[i],
        priority,
        tiebreakerRank: TIEBREAKER_ORDER.indexOf(i),
      })
    }
  }

  if (eligible.length === 0) {
    return { pillarKey: PILLAR_KEYS[0], pillarName: PILLAR_NAMES[PILLAR_KEYS[0]], score: pillarScores[0], priority: "MAINTAIN" }
  }

  const minScore = Math.min(...eligible.map((e) => e.score))
  const candidates = eligible.filter((e) => e.score === minScore)

  candidates.sort((a, b) => a.tiebreakerRank - b.tiebreakerRank)
  const winner = candidates[0]

  const key = PILLAR_KEYS[winner.pillarIndex]
  return { pillarKey: key, pillarName: PILLAR_NAMES[key], score: winner.score, priority: winner.priority }
}

export function calculateScaleCode(
  pillarScores: PillarScores,
  stageIndex: number,
): ScaleCodeResult {
  const scoresArray = PILLAR_KEYS.map((k) => pillarScores[k])
  const archetype = detectArchetype(scoresArray)
  const floor = detectFloor(scoresArray, stageIndex)
  const tier = getTier(stageIndex)
  const recommendation = RECOMMENDATIONS[floor.pillarKey]?.[tier] ?? ""

  const priorities: Record<string, string> = {}
  for (let i = 0; i < 8; i++) {
    priorities[PILLAR_KEYS[i]] = PRIORITY_MATRIX[i][stageIndex]
  }

  return {
    pillars: pillarScores,
    floor,
    archetype,
    stage: STAGES[stageIndex],
    stageIndex,
    stageRevenue: STAGE_REVENUE[stageIndex],
    tier,
    recommendation,
    priorities: priorities as Record<PillarKey, string>,
  }
}
