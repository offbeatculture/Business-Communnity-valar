"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, Leaf, Loader2 } from "lucide-react"
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

  return (
    <section className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-[#122015] px-4 py-16 text-[#F7F0E3] sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(200,155,60,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(232,221,200,0.08),transparent_28%)]" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,32,21,0.15),rgba(18,32,21,0.92))]" />

      <div className="relative w-full max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[1fr_430px] lg:items-center">
          <div className="text-center lg:text-left">
            <div className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#C89B3C]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#D8B76A] lg:justify-start">
              <Leaf className="size-3.5" />
              Lifinity Membership
            </div>

            <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-[#C89B3C]">
              Dr. Valarmathi Srinivasan
            </p>

            <h1 className="max-w-2xl font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-[#F7F0E3] sm:text-6xl">
              Something shifted during the Breath Chakra Reset.
            </h1>

            <p className="mt-4 max-w-xl font-serif text-3xl leading-tight text-[#F7F0E3]/95 sm:text-4xl">
              It&apos;s time to make this permanent.
            </p>

            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#E8DDC8]/75 sm:text-lg lg:mx-0">
              Join a community-led daily breathwork practice with Dr. Valarmathi
              Srinivasan. Build consistency, calm your nervous system, and
              continue the inner shift you started.
            </p>

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
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 text-center">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#C89B3C]">
                  Join the practice
                </p>

                <h3 className="font-serif text-3xl font-semibold leading-tight">
                  Lifinity Membership
                </h3>

                <div className="mt-5 flex items-end justify-center gap-1">
                  <span className="text-5xl font-bold tracking-tight">
                    ₹999
                  </span>
                  <span className="pb-1 text-base text-[#E8DDC8]/55">
                    /month
                  </span>
                </div>

                <p className="mt-3 text-sm text-[#E8DDC8]/60">
                  GST-inclusive monthly membership.
                </p>
              </div>

              <div className="my-6 h-px bg-[#E8DDC8]/15" />

              <div>
                <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#D8B76A]">
                  What you get
                </p>

                <ul className="space-y-4">
                  {[
                    "Guided breathwork sessions with Dr. Valarmathi Srinivasan",
                    "A community-led daily practice rhythm from Monday to Friday",
                    "Simple practices for calmness, balance, and emotional steadiness",
                    "Immediate access to session recordings and practice guidance",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#C89B3C]/15">
                        <Check className="size-3.5 text-[#D8B76A]" />
                      </span>
                      <span className="leading-6 text-[#E8DDC8]/75">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="my-6 h-px bg-[#E8DDC8]/15" />

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
                    "Join The Daily Practice"
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
      </div>
    </section>
  )
}