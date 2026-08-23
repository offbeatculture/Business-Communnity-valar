"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, Leaf, Loader2, Lock, Sparkles } from "lucide-react"
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

      router.push(`/plans?session=${data.sessionId}&autoCheckout=1`)
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  const features = [
    "4 live Kosha sessions every month",
    "4 live Q&As with Dr. Valar",
    "Personal Kosha Scan every 25 days",
    "7-day Kosha challenge inside the app",
    "Valar Emotions AI for quick support",
    "Daily live breathwork and movement sessions",
  ]

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-[#122015] px-4 py-12 text-[#F7F0E3]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(200,155,60,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(232,221,200,0.08),transparent_30%)]" />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_390px] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#C89B3C]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#D8B76A]">
            <Leaf className="size-3.5" />
            Lifinity Membership
          </div>

          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-[#C89B3C]">
            Dr. Valarmathi Srinivasan
          </p>

          <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-[#F7F0E3] sm:text-5xl lg:text-6xl">
            One session opens the door. Lifinity is where you walk through it.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#E8DDC8]/75">
            A guided monthly journey through the five koshas with live sessions,
            daily practice, personal scans, challenges, and support from Dr.
            Valar.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#D8B76A]/30 bg-[#D8B76A]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#D8B76A]">
            <Lock className="size-3.5" />
            Pre-launch opens 1st September
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 rounded-2xl border border-[#C89B3C]/20 bg-[#1F2A1B]/60 px-4 py-3"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#C89B3C]/15">
                  <Check className="size-3.5 text-[#D8B76A]" />
                </span>

                <span className="text-sm leading-6 text-[#E8DDC8]/75">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm text-[#E8DDC8]/65">
            Already a member?{" "}
            <Link
              href="/login"
              className="font-medium text-[#D8B76A] hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>

        <Card className="border-[#C89B3C]/25 bg-[#1F2A1B]/95 text-[#F7F0E3] shadow-2xl shadow-black/25">
          <CardContent className="p-7">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#C89B3C]/15">
                <Sparkles className="size-5 text-[#D8B76A]" />
              </div>

              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#C89B3C]">
                Join the practice
              </p>

              <h3 className="font-serif text-3xl font-semibold">
                Lifinity Membership
              </h3>

              <div className="mt-5 text-center">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#D8B76A]">
                  Pre-launch price
                </p>

                <div className="flex items-end justify-center gap-2">
                  <span className="text-5xl font-black tracking-tight text-[#F7F0E3]">
                    ₹999
                  </span>
                  <span className="pb-1.5 text-base text-[#E8DDC8]/65">
                    /month
                  </span>
                </div>

                <p className="mt-2 text-sm text-[#E8DDC8]/50">
                  Usually{" "}
                  <span className="line-through">₹2,500/month</span>
                </p>
              </div>

              <p className="mt-4 rounded-full bg-[#D8B76A]/10 px-4 py-2 text-sm font-semibold text-[#D8B76A]">
                Stays ₹999 as long as you’re a member
              </p>
            </div>

            <div className="my-6 rounded-2xl border border-[#C89B3C]/25 bg-[#122015] p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-[#E8DDC8]/75">
                  Total value
                </span>
                <span className="font-bold text-[#E8DDC8]/75 line-through">
                  ₹43,000/month
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-[#D8B76A]/10 px-4 py-3">
                <span className="text-sm font-semibold uppercase tracking-[0.14em] text-[#D8B76A]">
                  You pay
                </span>
                <span className="text-2xl font-black text-[#F7F0E3]">
                  ₹999/month
                </span>
              </div>
            </div>

            <div className="mb-6 space-y-3 text-sm text-[#E8DDC8]/70">
              <p className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-[#D8B76A]" />
                Everything opens on 1st September.
              </p>
              <p className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-[#D8B76A]" />
                Billed monthly. Cancel any time.
              </p>
              <p className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-[#D8B76A]" />
                Includes daily practice, Kosha sessions, Q&As, scans, AI, and
                community.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 border-[#E8DDC8]/15 bg-[#122015] text-[#F7F0E3] placeholder:text-[#E8DDC8]/35 focus-visible:ring-[#C89B3C]"
                required
              />

              <Button
                type="submit"
                size="lg"
                className="h-12 w-full rounded-full bg-[#C89B3C] text-base font-semibold text-[#122015] hover:bg-[#D8B76A]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Join Lifinity Now"
                )}
              </Button>
            </form>

            {error && (
              <p className="mt-3 text-center text-sm text-[#F2A7A7]">
                {error}
              </p>
            )}

            <p className="mt-4 text-center text-xs text-[#E8DDC8]/45">
              Enter your email to continue to secure payment.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}