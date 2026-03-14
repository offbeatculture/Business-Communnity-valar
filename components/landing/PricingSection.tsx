"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  getCurrentTier,
  getSpotsRemaining,
  getPlansForCurrentTier,
  getAllTiers,
  formatINR,
} from "@/lib/plans"

export function PricingSection({ activeCount }: { activeCount: number }) {
  const [isAnnual, setIsAnnual] = useState(false)
  const tier = getCurrentTier(activeCount)
  const spotsLeft = getSpotsRemaining(activeCount)
  const plans = getPlansForCurrentTier(activeCount)
  const allTiers = getAllTiers()

  const features = [
    "Full content library",
    "AI-powered video summaries",
    "Community access",
    "Priority support",
  ]

  return (
    <section className="px-4 pb-20 max-w-4xl mx-auto w-full" id="pricing">
      <h2 className="text-3xl font-bold text-center mb-2">
        Simple, Transparent Pricing
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        Lock in the lowest price — it increases as our community grows.
      </p>

      {/* Urgency Badge */}
      {spotsLeft !== Infinity && spotsLeft > 0 && (
        <div className="flex justify-center mb-8">
          <Badge variant="outline" className="border-primary/30 text-primary px-4 py-2 text-sm">
            Only {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left at this price!
          </Badge>
        </div>
      )}

      {/* Toggle */}
      <div className="flex items-center justify-center gap-1 mb-8 bg-secondary rounded-full p-1 w-fit mx-auto">
        <button
          onClick={() => setIsAnnual(false)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            !isAnnual ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setIsAnnual(true)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            isAnnual ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Annual
          <span className="ml-1 text-xs opacity-75">(save 2 mo)</span>
        </button>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 sm:grid-cols-2 max-w-lg mx-auto mb-12">
        {plans.map((plan) => {
          const isSelected =
            (isAnnual && plan.interval === "annual") ||
            (!isAnnual && plan.interval === "monthly")

          return (
            <Card
              key={plan.id}
              className={`relative ${isSelected ? "ring-2 ring-primary" : ""}`}
            >
              <CardContent>
                {plan.savings && (
                  <span className="absolute -top-3 right-4 bg-primary text-white text-xs px-3 py-1 rounded-full font-medium">
                    {plan.savings}
                  </span>
                )}
                <p className="text-sm text-muted-foreground mb-1">
                  {plan.interval === "monthly" ? "Monthly" : "Annual"}
                </p>
                <p className="text-3xl font-bold mb-1">
                  {formatINR(plan.pricePaise)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{plan.interval === "monthly" ? "mo" : "yr"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mb-4">+ 18% GST</p>

                <ul className="space-y-2 mb-6 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-muted-foreground">
                      <Check className="size-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isSelected ? "default" : "outline"}
                  asChild
                >
                  <Link href="/login">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tier progression table */}
      <div className="max-w-md mx-auto">
        <h3 className="text-lg font-semibold text-center mb-4">
          Price increases as we grow
        </h3>
        {/* Mobile card layout */}
        <div className="sm:hidden space-y-3">
          {allTiers.map((t) => (
            <div
              key={t.name}
              className={`rounded-lg border p-3 text-sm ${
                t.name === tier.name ? "bg-primary/5 border-primary/30" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {t.label}
                  {t.name === tier.name && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      Current
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground tabular-nums text-xs">
                  {t.maxMembers === Infinity
                    ? `${t.minMembers}+`
                    : `${t.minMembers}–${t.maxMembers}`} members
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Monthly: <span className="text-foreground tabular-nums">{formatINR(t.monthlyPaise)}</span></span>
                <span>Annual: <span className="text-foreground tabular-nums">{formatINR(t.annualPaise)}</span></span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table layout */}
        <div className="hidden sm:block rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Tier</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Members</th>
                <th className="text-right px-4 py-2 text-muted-foreground font-medium">Monthly</th>
                <th className="text-right px-4 py-2 text-muted-foreground font-medium">Annual</th>
              </tr>
            </thead>
            <tbody>
              {allTiers.map((t) => (
                <tr
                  key={t.name}
                  className={`border-b last:border-0 ${
                    t.name === tier.name ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    {t.label}
                    {t.name === tier.name && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        Current
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground tabular-nums">
                    {t.maxMembers === Infinity
                      ? `${t.minMembers}+`
                      : `${t.minMembers}–${t.maxMembers}`}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatINR(t.monthlyPaise)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatINR(t.annualPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
