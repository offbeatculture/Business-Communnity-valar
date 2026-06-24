import type { ProductTier, TierPricingCard } from "@/lib/plans"

type TierChangeCardsProps = {
  tiers?: TierPricingCard[]
  currentTier?: ProductTier
  currentLockedPaise?: number
  startsAt?: string | null
  expiresAt?: string | null
  pendingDowngradeTo?: ProductTier | null
  alreadyChangedThisPeriod?: boolean
  isLegacy?: boolean
}

export function TierChangeCards(_props: TierChangeCardsProps) {
  return null
}