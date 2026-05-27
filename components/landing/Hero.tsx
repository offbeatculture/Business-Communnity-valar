"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Rocket, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export function Hero() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const trimmed = email.trim()

    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/onboarding/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Something went wrong")
        setLoading(false)
        return
      }

      // Important:
      // Email/session is still collected here.
      // Then plans page will auto-open Razorpay without making the user click again.
      router.push(`/plans?session=${data.sessionId}&autoCheckout=1`)
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
              <Rocket className="text-primary size-9 shrink-0" />
              <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-[#E53935] to-[#FF6D00] bg-clip-text text-transparent">
                SuperFounder
              </h1>
            </div>

            <p className="text-xl sm:text-3xl font-semibold mb-3">
              Own Your Growth
            </p>

            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-5">
              The 100X Founders Room
            </h2>

            <p className="text-muted-foreground text-lg sm:text-xl mb-8 max-w-xl mx-auto lg:mx-0">
              A private founder membership for business owners who want access
              to the community, live sessions, AI workflows, replays, and
              founder-focused opportunities.
            </p>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto lg:mx-0"
            >
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-white bg-[#1a1a1a] border-[#333] focus:border-[#E53935] sm:flex-1"
                required
              />

              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto h-12 px-8 text-base bg-[#E53935] hover:bg-[#d32f2f]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Join Now"
                )}
              </Button>
            </form>

            {error && <p className="text-sm text-destructive mt-3">{error}</p>}

            <p className="text-sm text-muted-foreground mt-6">
              Already a member?{" "}
              <Link href="/login" className="text-[#E53935] hover:underline">
                Log in
              </Link>
            </p>
          </div>

          <Card className="border border-[#E53935]/40 bg-[#151515] shadow-xl">
            <CardContent className="p-6 sm:p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">
                  The 100X Founders Room
                </h3>

                <div className="mt-5 flex items-end justify-center gap-1">
                  <span className="text-4xl sm:text-5xl font-bold">
                    ₹1,499
                  </span>
                  <span className="pb-1 text-base text-muted-foreground">
                    /month
                  </span>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  GST-inclusive monthly membership.
                </p>
              </div>

              <div className="my-6 h-px bg-border" />

              <div>
                <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  What you get
                </p>

                <ul className="space-y-4">
                  {[
                    "Access to The 100X Founders Room community",
                    "Live monthly founder sessions with Swastik",
                    "AI tools, workflows, and implementation breakdowns",
                    "Immediate access to all session replays",
                    "Live calls on Third and Fourth Wenesday of Every Month",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#E53935]/10">
                        <Check className="size-3.5 text-[#E53935]" />
                      </span>
                      <span className="leading-6 text-muted-foreground">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Enter your email to continue to secure payment.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}