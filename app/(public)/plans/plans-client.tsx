"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { openRazorpaySubscriptionCheckout } from "@/lib/razorpay-checkout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Check,
  CreditCard,
  ArrowLeft,
  Loader2,
  Sparkles,
  Users,
  Library,
} from "lucide-react"

type PlanTier = "library" | "workshop" | "ai_lab"

const PLANS: {
  tier: PlanTier
  name: string
  price: string
  amount: number
  description: string
  icon: React.ElementType
  highlight?: string
  features: string[]
  buttonLabel: string
}[] = [
  {
    tier: "library",
    name: "Library",
    price: "₹499",
    amount: 499,
    description: "For self-paced learning and community access.",
    icon: Library,
    features: [
      "Community feed",
      "Exclusive content library",
      "Workshop replays after 30 days",
      "Community posts & discussions",
      "Daily growth prompts",
      "GST invoice on every payment",
    ],
    buttonLabel: "Subscribe to Library",
  },
  {
    tier: "workshop",
    name: "Workshop",
    price: "₹1,299",
    amount: 1299,
    description: "For members who want live learning and participation.",
    icon: Users,
    highlight: "Most popular",
    features: [
      "Everything in Library",
      "Live monthly workshop",
      "Hot-seat applications",
      "Immediate workshop replays",
      "Community posts & discussions",
      "GST invoice on every payment",
    ],
    buttonLabel: "Subscribe to Workshop",
  },
  {
    tier: "ai_lab",
    name: "AI Lab",
    price: "₹1,499",
    amount: 1499,
    description: "For members who want workshops plus AI Lab access.",
    icon: Sparkles,
    highlight: "Best value",
    features: [
      "Everything in Workshop",
      "Monthly AI Lab event",
      "Reset early-bird access",
      "Live monthly workshop",
      "Hot-seat applications",
      "GST invoice on every payment",
    ],
    buttonLabel: "Subscribe to AI Lab",
  },
]

export default function PlansClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session")

  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null)
  const [error, setError] = useState("")

  const handleSubscribe = async (tier: PlanTier) => {
    if (!sessionId) {
      setError("Session expired. Please start over.")
      return
    }

    setLoadingTier(tier)
    setError("")

    try {
      const res = await fetch("/api/onboarding/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tier,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.details || data.error || "Failed to create subscription")
        setLoadingTier(null)
        return
      }

      openRazorpaySubscriptionCheckout(
  { 
    subscriptionId: data.subscriptionId,
    sessionId: sessionId,  // ← add this line only
  },
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
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto w-full max-w-6xl py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </div>

        <div className="mb-10 text-center">
          <p className="text-sm font-medium text-[#E53935] mb-2">
            Choose your membership
          </p>
          <h1 className="text-3xl md:text-4xl font-bold">
            Pick the plan that fits your growth
          </h1>
          <p className="text-muted-foreground mt-3">
            All plans are monthly, include GST invoices, and can be changed later.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const isLoading = loadingTier === plan.tier
            const isDisabled = loadingTier !== null

            return (
              <Card
                key={plan.tier}
                className={`relative flex flex-col ${
                  plan.highlight
                    ? "border-[#E53935]/50 shadow-md"
                    : "border-border"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#E53935] px-3 py-1 text-xs font-medium text-white">
                    {plan.highlight}
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#E53935]/10 text-[#E53935]">
                    <Icon className="size-6" />
                  </div>

                  <p className="text-sm font-medium text-[#E53935]">
                    {plan.name}
                  </p>

                  <CardTitle className="text-4xl font-bold">
                    {plan.price}
                    <span className="text-lg font-normal text-muted-foreground">
                      /month
                    </span>
                  </CardTitle>

                  <p className="text-sm text-muted-foreground mt-2 min-h-10">
                    {plan.description}
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    + 18% GST &middot; Autopay enabled &middot; Cancel anytime
                  </p>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col space-y-6">
                  <ul className="space-y-3 flex-1">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm"
                      >
                        <Check className="size-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full h-12 text-base"
                    onClick={() => handleSubscribe(plan.tier)}
                    disabled={isDisabled}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="size-4 mr-2" />
                        {plan.buttonLabel}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    You will be charged {plan.price} + GST monthly via Razorpay
                    autopay.
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {error && (
          <p className="text-sm text-destructive text-center mt-6">{error}</p>
        )}

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