"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { openRazorpayCheckout } from "@/lib/razorpay-checkout"
import { useRouter } from "next/navigation"

export default function RenewPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubscribe(planId: string) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to create order")
        setLoading(false)
        return
      }

      const { orderId, amount, planLabel } = await res.json()

      await openRazorpayCheckout(
        { orderId, amount, planLabel },
        () => {
          setLoading(false)
          router.push("/dashboard")
          router.refresh()
        },
        (errMsg) => {
          setError(errMsg)
          setLoading(false)
        }
      )
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  const features = [
    "Full content library",
    "AI-powered video summaries",
    "Community access",
    "Priority support",
  ]

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold text-center mb-2">Choose Your Plan</h1>
        <p className="text-muted-foreground text-center mb-8">
          Subscribe to unlock all Superhuman Entrepreneur features.
        </p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Monthly */}
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-1">Monthly</p>
              <p className="text-3xl font-bold mb-1">
                <span className="text-primary">&#8377;499</span>
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-xs text-muted-foreground mb-4">Starting price + 18% GST</p>

              <ul className="space-y-2 mb-6 text-sm">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="size-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe("monthly")}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? "Processing..." : "Subscribe Monthly"}
              </Button>
            </CardContent>
          </Card>

          {/* Annual */}
          <Card className="ring-2 ring-primary relative">
            <CardContent>
              <span className="absolute -top-3 right-4 bg-primary text-white text-xs px-3 py-1 rounded-full font-medium">
                Save 2 months
              </span>
              <p className="text-sm text-muted-foreground mb-1">Annual</p>
              <p className="text-3xl font-bold mb-1">
                <span className="text-primary">&#8377;4,999</span>
                <span className="text-sm font-normal text-muted-foreground">/yr</span>
              </p>
              <p className="text-xs text-muted-foreground mb-4">Starting price + 18% GST</p>

              <ul className="space-y-2 mb-6 text-sm">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="size-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe("annual")}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Processing..." : "Subscribe Annual"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
