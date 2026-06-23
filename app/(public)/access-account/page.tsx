"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Leaf, Loader2, CheckCircle2 } from "lucide-react"

export default function AccessAccountPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const res = await fetch("/api/onboarding/recover-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.")
      } else {
        setSuccess(true)
        setSuccessMessage(
          data.message ??
            "If we found an active paid account, we've sent a fresh access link to your email."
        )
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E8DDC8] p-4 text-[#4B3A25]">
      <Card className="w-full max-w-md border-[#C89B3C]/25 bg-[#F7F0E3] text-[#4B3A25] shadow-2xl shadow-black/10">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-[#C89B3C]/10">
                <Leaf className="h-6 w-6 text-[#8A6A22]" />
              </div>

              <div className="text-left">
                <span className="block text-xl font-bold leading-tight">
                  Daily Breathwork
                </span>
                <span className="text-xs text-[#6F7358]">
                  Valarmathi Community
                </span>
              </div>
            </div>
          </div>

          <CardTitle className="font-serif text-3xl font-semibold text-[#4B3A25]">
            Access Your Account
          </CardTitle>

          <CardDescription className="font-medium leading-6 text-[#6F7358]">
            Paid but didn&apos;t receive the email? Enter your email and
            we&apos;ll help you access your account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-[#C89B3C]/10">
                  <CheckCircle2 className="size-6 text-[#8A6A22]" />
                </div>
              </div>

              <p className="text-sm font-medium leading-6 text-[#6F7358]">
                {successMessage}
              </p>

              <p className="text-xs font-medium text-[#6F7358]">
                Check your inbox and spam folder. The link expires in 20
                minutes.
              </p>

              <Link href="/login">
                <Button
                  variant="outline"
                  className="mt-2 w-full rounded-full border-[#C89B3C]/30 bg-transparent text-[#8A6A22] hover:bg-[#C89B3C]/10 hover:text-[#4B3A25]"
                >
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-[#4B3A25]"
                >
                  Email
                </label>

                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-[#C89B3C]/25 bg-[#FFF8EA] text-[#4B3A25] placeholder:text-[#6F7358]/60 focus-visible:ring-[#C89B3C]"
                  required
                />
              </div>

              {error && <p className="text-sm text-[#B42318]">{error}</p>}

              <Button
                type="submit"
                className="w-full rounded-full bg-[#C89B3C] font-semibold text-[#122015] hover:bg-[#D8B76A]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Recover My Account"
                )}
              </Button>

              <p className="mt-4 text-center text-sm font-medium text-[#6F7358]">
                Already have a password?{" "}
                <Link href="/login" className="text-[#8A6A22] hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}