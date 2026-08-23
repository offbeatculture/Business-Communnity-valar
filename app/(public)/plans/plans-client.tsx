"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { openRazorpaySubscriptionCheckout } from "@/lib/razorpay-checkout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, ShieldCheck, Sparkles } from "lucide-react"
import {
  SINGLE_PLAN,
  formatINR,
  type ProductTier,
  type TierPricingCard,
} from "@/lib/plans"

type PlansClientProps = {
  tiers: TierPricingCard[]
  activeCount: number
  showLiveCounter: boolean
}

const SINGLE_TIER: ProductTier = "membership"

export default function PlansClient({
  tiers: _tiers,
  activeCount: _activeCount,
  showLiveCounter: _showLiveCounter,
}: PlansClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const sessionId = searchParams.get("session")
  const autoCheckout = searchParams.get("autoCheckout") === "1"

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const hasAutoStarted = useRef(false)

  const handleSubscribe = async () => {
    if (!sessionId) {
      setError("Session expired. Please start over.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/onboarding/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          tier: SINGLE_TIER,
          planId: SINGLE_PLAN.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.details || data.error || "Failed to create subscription")
        setLoading(false)
        return
      }

      openRazorpaySubscriptionCheckout(
        {
          subscriptionId: data.subscriptionId,
          sessionId,
        },
        () => {
          router.push(`/payment-success?session=${sessionId}`)
        },
        (err) => {
          setError(err)
          setLoading(false)
        }
      )
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!autoCheckout) return
    if (hasAutoStarted.current) return
    if (loading) return

    hasAutoStarted.current = true
    handleSubscribe()
  // }, [autoCheckout, loading])
    }, [autoCheckout])

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border/70 bg-card text-center shadow-sm">
          <CardContent className="p-8">
            <p className="mb-4 text-sm text-muted-foreground">
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md overflow-hidden border-primary/20 bg-card shadow-lg shadow-primary/5">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-primary/15 via-card to-secondary px-6 py-7 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="size-7 text-primary" />
            </div>

            <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
              Membership
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {SINGLE_PLAN.name}
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Monthly access to Dr Valar&apos;s Breathwork Community.
            </p>
          </div>

          <div className="space-y-6 p-6">
            <div className="rounded-2xl border border-border/70 bg-background/40 p-5 text-center">
              <p className="text-sm text-muted-foreground">Membership price</p>

              <div className="mt-2 flex items-end justify-center gap-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">
                  {formatINR(SINGLE_PLAN.amountPaise)}
                </span>
                <span className="pb-1 text-sm text-muted-foreground">
                  / month
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Access to the breathwork community.</span>
              </div>

              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Session recordings and practice resources.</span>
              </div>

              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Secure recurring payment powered by Razorpay.</span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loading ? "Opening payment..." : "Continue to Payment"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              You will be redirected to Razorpay to complete your payment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}