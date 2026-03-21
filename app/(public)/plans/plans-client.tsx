"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { openRazorpaySubscriptionCheckout } from "@/lib/razorpay-checkout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, CreditCard, ArrowLeft, Loader2 } from "lucide-react"

const FEATURES = [
  "Exclusive content library",
  "Community posts & discussions",
  "Daily growth prompts",
  "AI-powered video summaries",
  "Growth points & streaks",
  "GST invoice on every payment",
]

export default function PlansClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.details || data.error || "Failed to create subscription")
        setLoading(false)
        return
      }

      openRazorpaySubscriptionCheckout(
        { subscriptionId: data.subscriptionId },
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </div>

        <Card className="border-[#E53935]/30">
          <CardHeader className="text-center pb-2">
            <p className="text-sm font-medium text-[#E53935] mb-1">
              Monthly Plan
            </p>
            <CardTitle className="text-4xl font-bold">
              ₹499
              <span className="text-lg font-normal text-muted-foreground">
                /month
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              + 18% GST &middot; Autopay enabled &middot; Cancel anytime
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm">
                  <Check className="size-4 text-green-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <Button
                className="w-full h-12 text-base"
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="size-4 mr-2" />
                    Subscribe — ₹499/month
                  </>
                )}
              </Button>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <p className="text-xs text-muted-foreground text-center">
              You will be charged ₹499 + GST monthly via Razorpay autopay.
              Cancel anytime from your account settings.
            </p>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Already a member?{" "}
          <Link href="/login" className="text-[#E53935] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}