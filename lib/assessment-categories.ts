import { PILLAR_KEYS, PILLAR_NAMES } from "./scale-code"

export const PILLAR_CATEGORIES = PILLAR_KEYS

export const ASSESSMENT_CATEGORIES = [...PILLAR_KEYS, "revenue"] as const

export type AssessmentCategory = (typeof ASSESSMENT_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<string, string> = {
  ...PILLAR_NAMES,
  revenue: "Revenue",
}

export const CATEGORY_LABELS_SHORT: Record<string, string> = {
  offer: "Offer",
  leads: "Leads",
  conversion: "Conv",
  ops: "Ops",
  team: "Team",
  money: "Money",
  moat: "Moat",
  retention: "Ret",
}
