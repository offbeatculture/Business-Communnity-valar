"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { openRazorpayCheckout } from "@/lib/razorpay-checkout"
import { SINGLE_PLAN } from "@/lib/plans"

type Props = {
  planId?: string
  userEmail?: string
  userName?: string
}

export function RenewButton({
  planId: _planId,
  userEmail,
  userName,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleRenew() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: SINGLE_PLAN.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Failed to create payment order")
        setLoading(false)
        return
      }

      await openRazorpayCheckout(
        {
          orderId: data.orderId,
          amount: data.amount,
          planLabel: data.planLabel ?? SINGLE_PLAN.name,
          userEmail,
          userName,
        },
        () => {
          setLoading(false)
          router.push("/subscription?success=true")
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

  return (
    <div>
      <Button onClick={handleRenew} disabled={loading}>
        {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
        {loading ? "Opening Payment..." : "Renew Membership"}
      </Button>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}