"use client"

import { useState, type ElementType } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
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
  icon: ElementType
  features: string[]
}

const plans: RenewPlan[] = [
  {
    id: "ai_lab_monthly",
    tier: "ai_lab",
    tierLabel: "BREATHWORK MEMBERSHIP",
    name: " Lifinity Membership",
    price: "₹1499",
    description:
      "Guided breathwork practices, live sessions, recordings, and community support with Dr. Valarmathi Srinivasan.",
    badge: "Recommended",
    buttonLabel: "Renew Membership",
    highlighted: true,
    icon: Wind,
    features: [
      "Guided breathwork sessions with Dr. Valarmathi Srinivasan",
      "Simple daily practices for calmness and emotional balance",
      "Access to the Lifinity community",
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
    <div className="min-h-screen bg-[#E8DDC8] text-[#122015]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(200,155,60,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(18,32,21,0.12),transparent_28%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#F7F0E3] px-4 py-2 text-sm text-[#4B3A25] transition hover:bg-[#EFE3CC] hover:text-[#122015]"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        <section className="grid flex-1 items-center gap-10 lg:grid-cols-[1fr_1.25fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#F7F0E3] px-3 py-1 text-xs font-medium text-[#8A6A22]">
              <Sparkles className="size-3.5" />
              Breathwork Membership
            </div>

            <h1 className="max-w-xl text-4xl font-bold tracking-tight text-[#122015] sm:text-5xl">
              Renew your access to{" "}
              <span className="text-[#C89B3C]"> Daily Breathwork</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-[#5D4B33]">
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
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8A6A22]">
                Choose your plan
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#122015]">
                Continue with Daily Breathwork
              </h2>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-[#C89B3C]/40 bg-[#F7F0E3] px-4 py-3 text-sm text-[#8A6A22]">
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
                    className={`relative overflow-hidden bg-[#F7F0E3] text-[#122015] ${
                      plan.highlighted
                        ? "border-[#C89B3C]/70 shadow-2xl shadow-[#C89B3C]/10 ring-1 ring-[#C89B3C]/35"
                        : "border-[#C89B3C]/20"
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute inset-x-0 top-0 h-1 bg-[#C89B3C]" />
                    )}

                    {plan.badge && (
                      <div
                        className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${
                          plan.highlighted
                            ? "bg-[#123F25] text-[#F7F0E3]"
                            : "bg-[#C89B3C]/10 text-[#8A6A22]"
                        }`}
                      >
                        {plan.badge}
                      </div>
                    )}

                    <CardContent className="flex h-full flex-col p-6">
                      <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-[#C89B3C]/15 text-[#8A6A22]">
                        <Icon className="size-6" />
                      </div>

                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6A22]">
                        {plan.tierLabel}
                      </p>

                      <h3 className="pr-24 text-2xl font-bold leading-tight text-[#122015]">
                        {plan.name}
                      </h3>

                      <p className="mt-3 min-h-12 text-sm leading-6 text-[#5D4B33]">
                        {plan.description}
                      </p>

                      <div className="mt-6">
                        <span className="text-5xl font-bold tracking-tight text-[#122015]">
                          {plan.price}
                        </span>
                        <span className="ml-1 text-sm text-[#6B5B3E]">
                          /month
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-[#6B5B3E]">
                        GST-inclusive monthly membership.
                      </p>

                      <div className="my-6 h-px bg-[#C89B3C]/25" />

                      <ul className="mb-7 space-y-3.5 text-sm">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex gap-3 text-[#3F3A2F]">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#123F25]/10 text-[#123F25]">
                              <Check className="size-3.5" />
                            </span>
                            <span className="leading-6">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={loadingPlan !== null}
                        className="mt-auto h-11 w-full rounded-xl bg-[#123F25] text-[#F7F0E3] hover:bg-[#0B2A18]"
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

            <p className="mt-5 text-center text-xs leading-6 text-[#6B5B3E]">
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
  icon: ElementType
  label: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[#C89B3C]/25 bg-[#F7F0E3] px-3 py-3 text-sm text-[#4B3A25] shadow-sm">
      <Icon className="size-4 text-[#8A6A22]" />
      {label}
    </div>
  )
}