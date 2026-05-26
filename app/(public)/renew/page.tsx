"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { openRazorpayCheckout } from "@/lib/razorpay-checkout"
import { useRouter } from "next/navigation"

type RenewPlan = {
  id: "workshop_monthly" | "ai_lab_monthly"
  tier: "workshop" | "ai_lab"
  tierLabel: string
  name: string
  price: string
  description: string
  badge?: string
  buttonLabel: string
  highlighted?: boolean
  features: string[]
}

const plans: RenewPlan[] = [
  {
    id: "workshop_monthly",
    tier: "workshop",
    tierLabel: "TIER 2",
    name: "Workshop",
    price: "₹1,299",
    description: "Library, plus the live monthly workshop.",
    badge: "Most popular",
    buttonLabel: "Start with Workshop",
    highlighted: true,
    features: [
      "Everything in Library",
      "Live monthly Workshop event with Swastik",
      "Immediate access to all Workshop event replays",
      "Priority on ₹5K diagnostic call slots",
      "Workshop tier badge on profile",
    ],
  },
  {
    id: "ai_lab_monthly",
    tier: "ai_lab",
    tierLabel: "TIER 3",
    name: "AI Lab",
    price: "₹1,499",
    description: "Workshop, plus the monthly AI Lab.",
    buttonLabel: "Start with AI Lab",
    features: [
      "Everything in Workshop",
      "Live monthly AI Lab event with Swastik",
      "Immediate access to all AI Lab event replays",
      "AI Lab tier badge on profile",
      "Early-bird ticket window for Reset events",
    ],
  },
]

export default function RenewPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubscribe(planId: RenewPlan["id"]) {
    setLoadingPlan(planId)
    setError(null)

    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Failed to create order")
        setLoadingPlan(null)
        return
      }

      const { orderId, amount, planLabel } = data

      await openRazorpayCheckout(
        { orderId, amount, planLabel },
        () => {
          setLoadingPlan(null)
          router.push("/dashboard")
          router.refresh()
        },
        (errMsg) => {
          setError(errMsg)
          setLoadingPlan(null)
        }
      )
    } catch {
      setError("Something went wrong. Please try again.")
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-8 text-sm text-white/60 hover:text-white"
        >
          ← Back
        </button>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Choose your tier
          </h1>

          <div className="mt-3 inline-flex rounded-full bg-white/10 px-5 py-2 text-sm text-white/60">
            Founding band — locked prices for the first 100 members
          </div>
        </div>

        {error && (
          <div className="mx-auto mb-6 max-w-md rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => {
            const isLoading = loadingPlan === plan.id

            return (
              <Card
                key={plan.id}
                className={`relative bg-[#171717] text-white ${
                  plan.highlighted
                    ? "border-red-500 ring-1 ring-red-500"
                    : "border-red-500/25"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-red-500 px-5 py-1 text-xs font-semibold text-white">
                    {plan.badge}
                  </div>
                )}

                <CardContent className="p-7">
                  <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-white/45">
                    {plan.tierLabel}
                  </p>

                  <h2 className="mb-5 text-center text-2xl font-bold">
                    {plan.name}
                  </h2>

                  <div className="mb-4 text-center">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-sm text-white/50">/month</span>
                  </div>

                  <p className="mb-7 text-center text-sm text-white/50">
                    {plan.description}
                  </p>

                  <ul className="mb-8 space-y-4 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-white/80">
                        <Check className="mt-0.5 size-4 shrink-0 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loadingPlan !== null}
                    className={`w-full ${
                      plan.highlighted
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    }`}
                  >
                    {isLoading ? "Processing..." : plan.buttonLabel}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-8 text-center text-xs leading-relaxed text-white/45">
          <p>All prices in INR, GST-inclusive.</p>
          <p className="mt-2">
            Founding members lock their price for life as long as their
            subscription stays active.
          </p>
        </div>
      </div>
    </div>
  )
}