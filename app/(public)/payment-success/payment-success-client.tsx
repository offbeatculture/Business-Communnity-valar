"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Mail, Loader2 } from "lucide-react"

export default function PaymentSuccessClient() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session")
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const [resendError, setResendError] = useState("")

  const handleResend = async () => {
    setResending(true)
    setResendMessage("")
    setResendError("")

    try {
      const email = prompt("Enter your email to resend the login link:")
      if (!email) {
        setResending(false)
        return
      }

      const res = await fetch("/api/auth/magic-link/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sessionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setResendError(data.error ?? "Failed to resend")
      } else {
        setResendMessage(data.message ?? "Login link sent!")
      }
    } catch {
      setResendError("Something went wrong")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-10 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="size-8 text-green-500" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground">
              Your subscription is now active.
            </p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-[#E53935]">
              <Mail className="size-5" />
              <span className="font-medium">Check your email</span>
            </div>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a login link to your email. Click it to access
              your account and set your password.
            </p>
            <p className="text-xs text-muted-foreground">
              The link expires in 20 minutes.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Login Link"
              )}
            </Button>

            {resendMessage && (
              <p className="text-sm text-green-500">{resendMessage}</p>
            )}
            {resendError && (
              <p className="text-sm text-destructive">{resendError}</p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Already have a password?{" "}
            <Link href="/login" className="text-[#E53935] hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}