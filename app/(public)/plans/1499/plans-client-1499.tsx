"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { openRazorpaySubscriptionCheckout } from "@/lib/razorpay-checkout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import {
  type ProductTier,
  type TierPricingCard,
} from "@/lib/plans"

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

export default function PlansClient1499({
  tiers,
  activeCount,
  showLiveCounter,
}: PlansClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const sessionId = searchParams.get("session")
  const autoCheckout = searchParams.get("autoCheckout") === "1"

  const [loadingTier, setLoadingTier] = useState<ProductTier | null>(null)
  const [error, setError] = useState("")

  const hasAutoStarted = useRef(false)

  const selectedTier = tiers.find((tier) => tier.tier === "ai_lab")

  const handleSubscribe = async (tier: ProductTier) => {
    if (!sessionId) {
      setError("Session expired. Please start over.")
      return
    }

    setLoadingTier(tier)
    setError("")

    try {
      const res = await fetch("/api/onboarding/create-subscription-1499", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tier,
          planId: "plan_So30soR2w1VtxZ",
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

  useEffect(() => {
    if (!autoCheckout) return
    if (!selectedTier) return
    if (hasAutoStarted.current) return
    if (loadingTier !== null) return

    hasAutoStarted.current = true
    handleSubscribe(selectedTier.tier)
  }, [autoCheckout, selectedTier, loadingTier])

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

  if (!selectedTier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <p className="text-muted-foreground mb-4">
              The selected plan is currently unavailable. Please try again later.
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center border border-[#E53935]/40">
        <CardContent className="p-8">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-[#E53935]/10">
            <Loader2 className="size-6 animate-spin text-[#E53935]" />
          </div>

          <h1 className="text-2xl font-bold mb-3">
            Opening secure payment
          </h1>

          <p className="text-sm text-muted-foreground mb-6">
            Please wait while we redirect you to Razorpay.
          </p>

          {error && (
            <div className="space-y-4">
              <p className="text-sm text-destructive">{error}</p>

              <Button
                className="w-full bg-[#E53935] hover:bg-[#d32f2f]"
                onClick={() => handleSubscribe(selectedTier.tier)}
                disabled={loadingTier !== null}
              >
                {loadingTier ? "Retrying..." : "Try Again"}
              </Button>
            </div>
          )}

          {!autoCheckout && !error && (
            <Button
              className="w-full bg-[#E53935] hover:bg-[#d32f2f]"
              onClick={() => handleSubscribe(selectedTier.tier)}
              disabled={loadingTier !== null}
            >
              {loadingTier ? "Processing..." : "Continue to Payment"}
            </Button>
          )}

          <p className="mt-5 text-xs text-muted-foreground">
            Secure payment powered by Razorpay.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}