import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentlySellingTiers, type TierPricingCard } from "@/lib/plans"
import PlansClient from "./plans-client"

// Best-effort active subscription count. The page must render even if the
// database is unreachable, so any error or null result falls back to 0.
async function getActiveSubscriptionCount(): Promise<number> {
  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())

    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function PlansPage() {
  const activeCount = await getActiveSubscriptionCount()
  const tiers: TierPricingCard[] = getCurrentlySellingTiers(activeCount)

  // Live counter is only meaningful while the founding band (1–100) is
  // the actively selling band on the Library tier. Once that band fills,
  // we fall back to static copy rather than display a misleading number.
  const libraryTier = tiers.find((t) => t.tier === "library")
  const showLiveCounter = libraryTier?.band === "founding"

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PlansClient
        tiers={tiers}
        activeCount={activeCount}
        showLiveCounter={showLiveCounter}
      />
    </Suspense>
  )
}
