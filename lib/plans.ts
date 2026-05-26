// ============================================================
// Community App — Pricing Engine
//
// This file holds TWO pricing systems during the Phase 1 → Phase 2
// transition described in Three-tier-implementation-plan.md:
//
//   1. LEGACY: single-product `TIERS` (founding | early | growth | premium)
//      with the `getCurrentTier`, `getPlansForCurrentTier`,
//      `getSpotsRemaining`, `getNextTier`, `getAllTiers` helpers. Still
//      consumed by `(public)/plans/` and `app/api/razorpay/create-order/`.
//
//   2. NEW: 3-tier × 5-band system (`TIER_BANDS`) covering Library,
//      Workshop, and AI Lab products with founding | growth | scaled |
//      mature | cap milestone bands.
//
// Phase 2 will migrate the legacy callers onto the new exports and the
// legacy `TIERS` block will then be deleted. Until that migration lands,
// both systems must coexist and the legacy exports must keep their
// current signatures.
//
// GST helpers, currency formatting, and `SAC_CODE` are shared across
// both systems and are unchanged.
// ============================================================

// ── GST Constants ──

export const GST_RATE = 0.18
export const CGST_RATE = 0.09
export const SGST_RATE = 0.09
export const SAC_CODE = "998431"

// ============================================================
// LEGACY single-product pricing (Phase 1 — kept for back-compat)
// ============================================================

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

// ============================================================
// NEW 3-tier × 5-band pricing (per Three-tier-implementation-plan.md)
// ============================================================

// ── Tier + Band Types ──

export type ProductTier = "library" | "workshop" | "ai_lab"
export type TierBandName = "founding" | "growth" | "scaled" | "mature" | "cap"

export type TierBand = {
  tier: ProductTier
  band: TierBandName
  minMembers: number
  maxMembers: number // Infinity for cap
  monthlyPaise: number
  annualPaise: number
  tierLabel: string // "Library" | "Workshop" | "AI Lab"
  tierRank: 1 | 2 | 3
}

export type TierPricingCard = {
  tier: ProductTier
  tierLabel: string
  tierRank: 1 | 2 | 3
  band: TierBandName
  monthlyPaise: number
  annualPaise: number
  spotsRemainingInBand: number // Infinity for cap
}

// ── Tier Metadata (rank + label lookups) ──

export const TIER_RANKS: Readonly<Record<ProductTier, 1 | 2 | 3>> = {
  library: 1,
  workshop: 2,
  ai_lab: 3,
}

export const TIER_LABELS: Readonly<Record<ProductTier, string>> = {
library: "Library",
  workshop: "The Founders Room",
  ai_lab: "The 100X Founders Room",
}

// ── The 15-entry pricing matrix (3 tiers × 5 bands) ──
// Annual = 10 × monthly (2 months free), mirroring the legacy TIERS pattern.

export const TIER_BANDS: readonly TierBand[] = [
  // Library (rank 1)
  {
    tier: "library",
    band: "founding",
    minMembers: 1,
    maxMembers: 100,
    monthlyPaise: 49900,
    annualPaise: 499000,
    tierLabel: "Library",
    tierRank: 1,
  },
  {
    tier: "library",
    band: "growth",
    minMembers: 101,
    maxMembers: 500,
    monthlyPaise: 69900,
    annualPaise: 699000,
    tierLabel: "Library",
    tierRank: 1,
  },
  {
    tier: "library",
    band: "scaled",
    minMembers: 501,
    maxMembers: 1500,
    monthlyPaise: 99900,
    annualPaise: 999000,
    tierLabel: "Library",
    tierRank: 1,
  },
  {
    tier: "library",
    band: "mature",
    minMembers: 1501,
    maxMembers: 3000,
    monthlyPaise: 149900,
    annualPaise: 1499000,
    tierLabel: "Library",
    tierRank: 1,
  },
  {
    tier: "library",
    band: "cap",
    minMembers: 3001,
    maxMembers: Infinity,
    monthlyPaise: 199900,
    annualPaise: 1999000,
    tierLabel: "Library",
    tierRank: 1,
  },
  // Workshop (rank 2)
  {
    tier: "workshop",
    band: "founding",
    minMembers: 1,
    maxMembers: 100,
    monthlyPaise: 129900,
    annualPaise: 1299000,
    tierLabel: "The Founders Room",
    tierRank: 1,
  },
  {
    tier: "workshop",
    band: "growth",
    minMembers: 101,
    maxMembers: 500,
    monthlyPaise: 149900,
    annualPaise: 1499000,
    tierLabel: "Workshop",
    tierRank: 2,
  },
  {
    tier: "workshop",
    band: "scaled",
    minMembers: 501,
    maxMembers: 1500,
    monthlyPaise: 179900,
    annualPaise: 1799000,
    tierLabel: "Workshop",
    tierRank: 2,
  },
  {
    tier: "workshop",
    band: "mature",
    minMembers: 1501,
    maxMembers: 3000,
    monthlyPaise: 249900,
    annualPaise: 2499000,
    tierLabel: "Workshop",
    tierRank: 2,
  },
  {
    tier: "workshop",
    band: "cap",
    minMembers: 3001,
    maxMembers: Infinity,
    monthlyPaise: 129900,
    annualPaise: 129900,
    tierLabel: "Workshop",
    tierRank: 2,
  },
  // AI Lab (rank 3)
  {
    tier: "ai_lab",
    band: "founding",
    minMembers: 1,
    maxMembers: 100,
    monthlyPaise: 149900,
    annualPaise: 1499000,
    tierLabel: "The 100X Founders Room",
    tierRank: 2,
  },
  {
    tier: "ai_lab",
    band: "growth",
    minMembers: 101,
    maxMembers: 500,
    monthlyPaise: 149900,
    annualPaise: 149900,
    tierLabel: "The 100X Founders Room",
    tierRank: 3,
  },
  {
    tier: "ai_lab",
    band: "scaled",
    minMembers: 501,
    maxMembers: 1500,
    monthlyPaise: 249900,
    annualPaise: 2499000,
    tierLabel: "AI Lab",
    tierRank: 3,
  },
  {
    tier: "ai_lab",
    band: "mature",
    minMembers: 1501,
    maxMembers: 3000,
    monthlyPaise: 149900,
    annualPaise: 149900,
    tierLabel: "AI Lab",
    tierRank: 3,
  },
  {
    tier: "ai_lab",
    band: "cap",
    minMembers: 3001,
    maxMembers: Infinity,
    monthlyPaise: 149900,
    annualPaise: 149900,
    tierLabel: "AI Lab",
    tierRank: 3,
  },
]

// ── New tier-aware helpers ──

// Returns the band currently selling for the given tier at the current member count.
// Falls back to the `cap` band if `activeCount` is past every defined band.
export function getTierBand(tier: ProductTier, activeCount: number): TierBand {
  const bandsForTier = TIER_BANDS.filter((b) => b.tier === tier)
  const match = bandsForTier.find(
    (b) => activeCount >= b.minMembers && activeCount <= b.maxMembers,
  )
  return match ?? bandsForTier[bandsForTier.length - 1]
}

// Returns three pricing cards (one per ProductTier) reflecting what a new joiner pays right now.
export function getCurrentlySellingTiers(activeCount: number): TierPricingCard[] {
  const productTiers: ProductTier[] = ["library", "workshop", "ai_lab"]
  return productTiers.map((tier) => {
    const band = getTierBand(tier, activeCount)
    const spotsRemainingInBand =
      band.maxMembers === Infinity
        ? Infinity
        : Math.max(0, band.maxMembers - activeCount)
    return {
      tier: band.tier,
      tierLabel: band.tierLabel,
      tierRank: band.tierRank,
      band: band.band,
      monthlyPaise: band.monthlyPaise,
      annualPaise: band.annualPaise,
      spotsRemainingInBand,
    }
  })
}

// Returns the numeric rank for a tier (Library=1, Workshop=2, AI Lab=3).
export function getTierRank(tier: ProductTier): 1 | 2 | 3 {
  return TIER_RANKS[tier]
}

// Returns true when `userTier` rank is at least as high as `requiredTier` rank.
export function tierMeetsRequirement(
  userTier: ProductTier,
  requiredTier: ProductTier,
): boolean {
  return getTierRank(userTier) >= getTierRank(requiredTier)
}

// Returns the human-readable label for a tier ("Library" | "Workshop" | "AI Lab").
export function getTierLabel(tier: ProductTier): string {
  return TIER_LABELS[tier]
}
