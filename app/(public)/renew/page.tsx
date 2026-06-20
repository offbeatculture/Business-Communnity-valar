"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  HeartPulse,
  Leaf,
  Loader2,
  ShieldCheck,
  Sparkles,
  Video,
  Wind,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { openRazorpayCheckout } from "@/lib/razorpay-checkout"

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
  icon: React.ElementType
  features: string[]
}

const plans: RenewPlan[] = [
  {
    id: "ai_lab_monthly",
    tier: "ai_lab",
    tierLabel: "BREATHWORK MEMBERSHIP",
    name: "Daily Breathwork Membership",
    price: "₹999",
    description:
      "Guided breathwork practices, live sessions, recordings, and community support with Dr. Valarmathi Srinivasan.",
    badge: "Recommended",
    buttonLabel: "Renew Membership",
    highlighted: true,
    icon: Wind,
    features: [
      "Guided breathwork sessions with Dr. Valarmathi Srinivasan",
      "Simple daily practices for calmness and emotional balance",
      "Access to the Daily Breathwork community",
      "Immediate access to session recordings",
      "Support to build consistency in your breathing practice",
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
    <div className="min-h-screen bg-[#061615] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_28%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200/10 bg-white/[0.03] px-4 py-2 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        <section className="grid flex-1 items-center gap-10 lg:grid-cols-[1fr_1.25fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-400/25 bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-300">
              <Sparkles className="size-3.5" />
              Breathwork Membership
            </div>

            <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
              Renew your access to{" "}
              <span className="bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">
                Daily Breathwork
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/65">
              Continue your access to guided breathwork sessions, community
              support, recordings, and daily practice guidance with Dr.
              Valarmathi Srinivasan.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              <TrustItem icon={Video} label="Live sessions" />
              <TrustItem icon={Leaf} label="Daily practice" />
              <TrustItem icon={ShieldCheck} label="GST inclusive" />
            </div>
          </div>

          <div>
            <div className="mb-5 text-center lg:text-left">
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-white/40">
                Choose your plan
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Continue with Daily Breathwork
              </h2>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-teal-400/40 bg-teal-400/10 px-4 py-3 text-sm text-teal-200">
                {error}
              </div>
            )}

            <div className="mx-auto grid max-w-md gap-5">
              {plans.map((plan) => {
                const isLoading = loadingPlan === plan.id
                const Icon = plan.icon

                return (
                  <Card
                    key={plan.id}
                    className={`relative overflow-hidden bg-[#0E2A2A] text-white ${
                      plan.highlighted
                        ? "border-teal-400/70 shadow-2xl shadow-teal-500/10 ring-1 ring-teal-400/40"
                        : "border-white/10"
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-300" />
                    )}

                    {plan.badge && (
                      <div
                        className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${
                          plan.highlighted
                            ? "bg-teal-500 text-white"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        {plan.badge}
                      </div>
                    )}

                    <CardContent className="flex h-full flex-col p-6">
                      <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-300">
                        <Icon className="size-6" />
                      </div>

                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                        {plan.tierLabel}
                      </p>

                      <h3 className="pr-24 text-2xl font-bold leading-tight">
                        {plan.name}
                      </h3>

                      <p className="mt-3 min-h-12 text-sm leading-6 text-white/60">
                        {plan.description}
                      </p>

                      <div className="mt-6">
                        <span className="text-5xl font-bold tracking-tight">
                          {plan.price}
                        </span>
                        <span className="ml-1 text-sm text-white/45">
                          /month
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-white/45">
                        GST-inclusive monthly membership.
                      </p>

                      <div className="my-6 h-px bg-white/10" />

                      <ul className="mb-7 space-y-3.5 text-sm">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex gap-3 text-white/75">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-400/15 text-teal-300">
                              <Check className="size-3.5" />
                            </span>
                            <span className="leading-6">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={loadingPlan !== null}
                        className={`mt-auto h-11 w-full rounded-xl ${
                          plan.highlighted
                            ? "bg-teal-500 text-white hover:bg-teal-600"
                            : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          plan.buttonLabel
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <p className="mt-5 text-center text-xs leading-6 text-white/40">
              Members keep their plan price as long as the subscription remains
              active.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

function TrustItem({
  icon: Icon,
  label,
}: {
  icon: React.ElementType
  label: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/10 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
      <Icon className="size-4 text-teal-300" />
      {label}
    </div>
  )
}