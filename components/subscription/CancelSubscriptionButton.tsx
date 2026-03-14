"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function CancelSubscriptionButton({
  subscriptionId,
}: {
  subscriptionId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel? You'll keep access until the end of your billing period.")) {
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/razorpay/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? "Failed to cancel subscription")
        return
      }

      router.refresh()
    } catch {
      alert("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive border-destructive/30 hover:bg-destructive/10"
      onClick={handleCancel}
      disabled={loading}
    >
      {loading ? "Cancelling..." : "Cancel"}
    </Button>
  )
}
