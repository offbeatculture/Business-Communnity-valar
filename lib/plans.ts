// ============================================================
// Dr Valar Community — Single Plan Pricing Engine
//
// Single active plan:
// Breathwork Community Membership — ₹999 / month
//
// Razorpay plan id must be set in .env:
// RAZORPAY_PLAN_ID_MONTHLY=plan_xxxxxxxxxxxxx
// ============================================================

// ── GST Constants ──

export const GST_RATE = 0.18
export const CGST_RATE = 0.09
export const SGST_RATE = 0.09
export const SAC_CODE = "998431"

// ============================================================
// SINGLE PLAN CONFIG
// ============================================================

export const SINGLE_PLAN = {
  id: "monthly",
  // name: "Breathwork Community Membership",
  name: "Lifinity Membership",
  // label: "Breathwork Community Membership",
  label: "Lifinity Membership",
  description: "Monthly access to Dr Valar's Breathwork Community.",
  amountPaise: 149900,
  amountRupees: 1499,
  interval: "monthly" as const,
  durationDays: 30,
  razorpayPlanEnvKey: "RAZORPAY_PLAN_ID_MONTHLY",
}

// ============================================================
// LEGACY COMPATIBILITY EXPORTS
// Kept so old business-community imports do not break.
// ============================================================

export type TierName = "membership"

export type Tier = {
  name: TierName
  label: string
  minMembers: number
  maxMembers: number
  monthlyPaise: number
  annualPaise: number
}

const TIERS: Tier[] = [
  {
    name: "membership",
    label: SINGLE_PLAN.label,
    minMembers: 0,
    maxMembers: Infinity,
    monthlyPaise: SINGLE_PLAN.amountPaise,
    annualPaise: SINGLE_PLAN.amountPaise * 12,
  },
]

export type PricingPlan = {
  id: string
  label: string
  pricePaise: number
  interval: "monthly" | "annual"
  durationDays: number
  savings?: string
  razorpayPlanEnvKey?: string
}

export function getCurrentTier(_activeCount: number): Tier {
  return TIERS[0]
}

export function getSpotsRemaining(_activeCount: number): number {
  return Infinity
}

export function getNextTier(_activeCount: number): Tier | null {
  return null
}

export function getPlansForCurrentTier(_activeCount: number): PricingPlan[] {
  return [
    {
      id: SINGLE_PLAN.id,
      label: SINGLE_PLAN.label,
      pricePaise: SINGLE_PLAN.amountPaise,
      interval: SINGLE_PLAN.interval,
      durationDays: SINGLE_PLAN.durationDays,
      razorpayPlanEnvKey: SINGLE_PLAN.razorpayPlanEnvKey,
    },
  ]
}

export function getAllTiers(): Tier[] {
  return [...TIERS]
}

// ============================================================
// GST Calculation
// ============================================================

export type GSTBreakdown = {
  base: number
  cgst: number
  sgst: number
  igst: number
  total: number
}

export function calculateGST(basePaise: number): GSTBreakdown {
  const cgst = Math.round(basePaise * CGST_RATE)
  const sgst = Math.round(basePaise * SGST_RATE)

  return {
    base: basePaise,
    cgst,
    sgst,
    igst: 0,
    total: basePaise + cgst + sgst,
  }
}

// ============================================================
// Currency Formatting
// ============================================================

export function formatINR(paise: number): string {
  const rupees = paise / 100

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees)
}

// ============================================================
// OLD 3-TIER COMPATIBILITY EXPORTS
// These are kept only so existing imports do not fail.
// Internally, everything resolves to the single membership plan.
// ============================================================

export type ProductTier = "membership" | "library" | "workshop" | "ai_lab"

export type TierBandName = "membership"

export type TierBand = {
  tier: ProductTier
  band: TierBandName
  minMembers: number
  maxMembers: number
  monthlyPaise: number
  annualPaise: number
  tierLabel: string
  tierRank: 1 | 2 | 3
}

export type TierPricingCard = {
  tier: ProductTier
  tierLabel: string
  tierRank: 1 | 2 | 3
  band: TierBandName
  monthlyPaise: number
  annualPaise: number
  spotsRemainingInBand: number
}

export const TIER_RANKS: Readonly<Record<ProductTier, 1 | 2 | 3>> = {
  membership: 1,
  library: 1,
  workshop: 1,
  ai_lab: 1,
}

export const TIER_LABELS: Readonly<Record<ProductTier, string>> = {
  membership: SINGLE_PLAN.label,
  library: SINGLE_PLAN.label,
  workshop: SINGLE_PLAN.label,
  ai_lab: SINGLE_PLAN.label,
}

export const TIER_BANDS: readonly TierBand[] = [
  {
    tier: "membership",
    band: "membership",
    minMembers: 0,
    maxMembers: Infinity,
    monthlyPaise: SINGLE_PLAN.amountPaise,
    annualPaise: SINGLE_PLAN.amountPaise * 12,
    tierLabel: SINGLE_PLAN.label,
    tierRank: 1,
  },
]

export function getTierBand(
  _tier: ProductTier,
  _activeCount: number
): TierBand {
  return TIER_BANDS[0]
}

export function getCurrentlySellingTiers(
  _activeCount: number
): TierPricingCard[] {
  return [
    {
      tier: "membership",
      tierLabel: SINGLE_PLAN.label,
      tierRank: 1,
      band: "membership",
      monthlyPaise: SINGLE_PLAN.amountPaise,
      annualPaise: SINGLE_PLAN.amountPaise * 12,
      spotsRemainingInBand: Infinity,
    },
  ]
}

export function getTierRank(_tier: ProductTier): 1 | 2 | 3 {
  return 1
}

export function tierMeetsRequirement(
  _userTier: ProductTier,
  _requiredTier: ProductTier
): boolean {
  return true
}

export function getTierLabel(_tier: ProductTier): string {
  return SINGLE_PLAN.label
}