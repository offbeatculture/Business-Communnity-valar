"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { openRazorpaySubscriptionCheckout } from "@/lib/razorpay-checkout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, ArrowLeft, Loader2 } from "lucide-react"
import {
  formatINR,
  type ProductTier,
  type TierPricingCard,
} from "@/lib/plans"

// Per-tier copy. Pricing comes from `lib/plans.ts`; the marketing copy
// here is what makes each card recognisable on the page.
const TIER_COPY: Record<
  ProductTier,
  { pitch: string; bullets: string[]; cta: string }
> = {
  library: {
    pitch: "The library and the community.",
    bullets: [
      "Async community feed (wins, questions, discussions)",
      "Templates and frameworks library",
      "Walls library (Reels archive, organized by topic)",
      "Weekly prompts",
      "Monthly newsletter (The Scale Letters)",
      "Workshop replays after 30-day delay",
    ],
    cta: "Start with Library",
  },
  workshop: {
    pitch: "Library, plus the live monthly workshop.",
    bullets: [
      "Everything in Library",
      "Live monthly Workshop event with Swastik (90 minutes, hot-seat format)",
      "Immediate access to all Workshop event replays",
      "Priority on ₹5K diagnostic call slots",
      "Workshop tier badge on profile",
    ],
    cta: "Start with Workshop",
  },
  ai_lab: {
    pitch: "Workshop, plus the monthly AI Lab.",
    bullets: [
      "Everything in Workshop",
      "Live monthly AI Lab event with Swastik (90 minutes, AI tools and workflows)",
      "Immediate access to all AI Lab event replays",
      "AI Lab tier badge on profile",
      "Early-bird ticket window for Reset events",
    ],
    cta: "Start with AI Lab",
  },
}

const TIER_PLAN_ID: Record<ProductTier, string> = {
  library: "library_monthly",
  workshop: "workshop_monthly",
  ai_lab: "ai_lab_monthly",
}

type PlansClientProps = {
  tiers: TierPricingCard[]
  activeCount: number
  showLiveCounter: boolean
}

export default function PlansClient({
  tiers,
  activeCount,
  showLiveCounter,
}: PlansClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session")
  const [loadingTier, setLoadingTier] = useState<ProductTier | null>(null)
  const [error, setError] = useState("")

  const handleSubscribe = async (tier: ProductTier) => {
    if (!sessionId) {
      setError("Session expired. Please start over.")
      return
    }

    setLoadingTier(tier)
    setError("")

    try {
      // Pass `tier` and the resolved `planId` in the request body. The
      // onboarding API may evolve to consume these (Phase 2C); for now
      // unknown fields are safely ignored by the existing Zod schema.
      const res = await fetch("/api/onboarding/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tier,
          planId: TIER_PLAN_ID[tier],
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.details || data.error || "Failed to create subscription")
        setLoadingTier(null)
        return
      }

      openRazorpaySubscriptionCheckout(
        { subscriptionId: data.subscriptionId, sessionId },
        () => {
          router.push(`/payment-success?session=${sessionId}`)
        },
        (err) => {
          setError(err)
          setLoadingTier(null)
        }
      )
    } catch {
      setError("Something went wrong. Please try again.")
      setLoadingTier(null)
    }
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <p className="text-muted-foreground mb-4">
              No active session found. Please start from the homepage.
            </p>
            <Button asChild>
              <Link href="/">Go to Homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Choose your tier
          </h1>
          {showLiveCounter ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E53935]/30 bg-[#E53935]/10 px-4 py-1.5 text-sm font-medium text-[#E53935]">
              <span className="size-2 rounded-full bg-[#E53935]" />
              {Math.min(activeCount, 100)} / 100 founding members locked in
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground">
              Founding band &mdash; locked prices for the first 100 members
            </span>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
          {tiers.map((tier) => {
            const copy = TIER_COPY[tier.tier]
            const isFeatured = tier.tier === "workshop"
            const isLoading = loadingTier === tier.tier
            const anyLoading = loadingTier !== null

            return (
              <Card
                key={tier.tier}
                className={
                  isFeatured
                    ? "relative border-2 border-[#E53935] shadow-lg md:scale-[1.02]"
                    : "relative border-[#E53935]/20"
                }
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[#E53935] px-3 py-1 text-xs font-semibold text-white">
                      Most popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    Tier {tier.tierRank}
                  </p>
                  <CardTitle className="text-2xl font-bold">
                    {tier.tierLabel}
                  </CardTitle>
                  <p className="mt-3 text-3xl sm:text-4xl font-bold">
                    {formatINR(tier.monthlyPaise)}
                    <span className="text-base font-normal text-muted-foreground">
                      /month
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {copy.pitch}
                  </p>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-6">
                  <ul className="space-y-3 flex-1">
                    {copy.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-3 text-sm"
                      >
                        <Check className="size-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full h-12 text-base"
                    variant={isFeatured ? "default" : "outline"}
                    onClick={() => handleSubscribe(tier.tier)}
                    disabled={anyLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      copy.cta
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {error && (
          <p className="text-sm text-destructive text-center mt-6">{error}</p>
        )}

        <div className="mt-10 text-center text-xs text-muted-foreground space-y-2 max-w-2xl mx-auto">
          <p>All prices in INR, GST-inclusive.</p>
          <p>
            Founding members lock their tier price for life as long as their
            subscription stays active. Once 100 founding members join, prices
            move to the next milestone band for new joiners.
          </p>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-8">
          Already a member?{" "}
          <Link href="/login" className="text-[#E53935] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
