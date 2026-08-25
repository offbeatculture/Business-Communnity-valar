"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Users, ArrowLeft } from "lucide-react"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createClient()

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      window.location.origin

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/confirm?next=/set-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Community</span>
            </div>
          </div>

          <CardTitle className="text-xl">Reset password</CardTitle>

          <CardDescription>
            {success
              ? "Check your email for the reset link"
              : "Enter your email to receive a reset link"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                We sent a password reset link to <strong>{email}</strong>.
                Check your inbox and follow the link to reset your password.
              </p>

              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
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
                {loading ? "Sending..." : "Send reset link"}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="inline mr-1 h-3 w-3" />
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}