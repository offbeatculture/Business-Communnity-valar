"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

      router.push(`/plans?session=${data.sessionId}`)
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32">
      <div className="max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Rocket className="text-primary size-9 shrink-0" />
          <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-[#E53935] to-[#FF6D00] bg-clip-text text-transparent">
            Superhuman Entrepreneur
          </h1>
        </div>

        <p className="text-xl sm:text-3xl font-semibold mb-3">
          Own Your Growth
        </p>
        <p className="text-muted-foreground text-lg sm:text-xl mb-10 max-w-lg mx-auto">
          The exclusive community for business owners who want to build, scale
          &amp; exit like a founder.
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row items-center gap-3 justify-center max-w-md mx-auto"
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
            className="w-full sm:w-auto h-12 px-8 text-base"
            disabled={loading}
          >
            {loading ? "Starting..." : "Get Started"}
          </Button>
        </form>

        {error && (
          <p className="text-sm text-destructive mt-3">{error}</p>
        )}

        <p className="text-sm text-muted-foreground mt-6">
          Already a member?{" "}
          <Link href="/login" className="text-[#E53935] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </section>
  )
}
