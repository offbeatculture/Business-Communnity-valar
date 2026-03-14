"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { openRazorpayCheckout } from "@/lib/razorpay-checkout"
import { useRouter } from "next/navigation"

type Props = {
  planId: string
  userEmail?: string
  userName?: string
}

export function RenewButton({ planId, userEmail, userName }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleRenew() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to create order")
        setLoading(false)
        return
      }

      const { orderId, amount, planLabel } = await res.json()

      await openRazorpayCheckout(
        { orderId, amount, planLabel, userEmail, userName },
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
        {loading ? "Processing..." : "Renew Subscription"}
      </Button>
      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
    </div>
  )
}
