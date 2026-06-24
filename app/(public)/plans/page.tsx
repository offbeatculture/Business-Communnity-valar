import { Suspense } from "react"
import PlansClient from "./plans-client"
import { getCurrentlySellingTiers, type TierPricingCard } from "@/lib/plans"

export default async function PlansPage() {
  const tiers: TierPricingCard[] = getCurrentlySellingTiers(0)

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PlansClient
        tiers={tiers}
        activeCount={0}
        showLiveCounter={false}
      />
    </Suspense>
  )
}