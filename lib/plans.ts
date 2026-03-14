// ============================================================
// Superhuman Entrepreneur — Pricing Engine
// Tiered pricing that increases as community grows
// ============================================================

// ── GST Constants ──

export const GST_RATE = 0.18
export const CGST_RATE = 0.09
export const SGST_RATE = 0.09
export const SAC_CODE = "998431"

// ── Tier Definitions ──

export type TierName = "founding" | "early" | "growth" | "premium"

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
    name: "founding",
    label: "Founding Member",
    minMembers: 0,
    maxMembers: 25,
    monthlyPaise: 49900,
    annualPaise: 499900,
  },
  {
    name: "early",
    label: "Early Adopter",
    minMembers: 26,
    maxMembers: 50,
    monthlyPaise: 79900,
    annualPaise: 799900,
  },
  {
    name: "growth",
    label: "Growth",
    minMembers: 51,
    maxMembers: 100,
    monthlyPaise: 99900,
    annualPaise: 999900,
  },
  {
    name: "premium",
    label: "Premium",
    minMembers: 101,
    maxMembers: Infinity,
    monthlyPaise: 149900,
    annualPaise: 1499900,
  },
]

// ── Plan Type (for UI cards) ──

export type PricingPlan = {
  id: string
  label: string
  pricePaise: number
  interval: "monthly" | "annual"
  durationDays: number
  savings?: string
}

// ── Public Functions ──

export function getCurrentTier(activeCount: number): Tier {
  return (
    TIERS.find((t) => activeCount >= t.minMembers && activeCount <= t.maxMembers) ??
    TIERS[TIERS.length - 1]
  )
}

export function getSpotsRemaining(activeCount: number): number {
  const tier = getCurrentTier(activeCount)
  if (tier.maxMembers === Infinity) return Infinity
  return Math.max(0, tier.maxMembers - activeCount)
}

export function getNextTier(activeCount: number): Tier | null {
  const current = getCurrentTier(activeCount)
  const idx = TIERS.indexOf(current)
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null
}

export function getPlansForCurrentTier(activeCount: number): PricingPlan[] {
  const tier = getCurrentTier(activeCount)
  return [
    {
      id: "monthly",
      label: `${tier.label} — Monthly`,
      pricePaise: tier.monthlyPaise,
      interval: "monthly",
      durationDays: 30,
    },
    {
      id: "annual",
      label: `${tier.label} — Annual`,
      pricePaise: tier.annualPaise,
      interval: "annual",
      durationDays: 365,
      savings: "Save 2 months",
    },
  ]
}

export function getAllTiers(): Tier[] {
  return [...TIERS]
}

// ── GST Calculation ──

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

// ── Currency Formatting ──

export function formatINR(paise: number): string {
  const rupees = paise / 100
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees)
}
