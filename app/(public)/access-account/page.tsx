"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Loader2, CheckCircle2 } from "lucide-react"

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-[#E53935]" />
              <span className="text-2xl font-bold">Community</span>
            </div>
          </div>
          <CardTitle className="text-xl">Access Your Account</CardTitle>
          <CardDescription>
            Paid but didn&apos;t receive the email? Enter your email and
            we&apos;ll help you access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="size-6 text-green-500" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{successMessage}</p>
              <p className="text-xs text-muted-foreground">
                Check your inbox and spam folder. The link expires in 20 minutes.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full mt-2">
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Recover My Account"
                )}
              </Button>

              <p className="text-sm text-muted-foreground text-center mt-4">
                Already have a password?{" "}
                <Link href="/login" className="text-[#E53935] hover:underline">
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
