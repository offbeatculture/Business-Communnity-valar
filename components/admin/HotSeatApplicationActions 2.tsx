// ============================================================
// HotSeatApplicationActions — small client island for the per-row
// "Select" / "Reject" buttons on the applications review page.
// ============================================================
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"

type Props = {
  eventId: string
  applicationId: string
  currentStatus: "pending" | "selected" | "rejected" | "withdrawn"
}

export function HotSeatApplicationActions({
  eventId,
  applicationId,
  currentStatus,
}: Props) {
  const router = useRouter()
  const [pending, setPending] = useState<"selected" | "rejected" | null>(null)

  // Withdrawn applications are member-driven and cannot be acted on by admins.
  // We render a disabled marker instead of the action buttons.
  if (currentStatus === "withdrawn") {
    return <span className="text-xs text-muted-foreground">Withdrawn</span>
  }

  async function setStatus(status: "selected" | "rejected") {
    setPending(status)
    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to update application")
      }
      toast.success(status === "selected" ? "Selected" : "Rejected")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update",
      )
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={currentStatus === "selected" ? "default" : "outline"}
        size="sm"
        onClick={() => setStatus("selected")}
        disabled={pending !== null}
      >
        {pending === "selected" ? (
          <Loader2 className="size-3.5 animate-spin mr-1" />
        ) : (
          <Check className="size-3.5 mr-1" />
        )}
        Select
      </Button>
      <Button
        variant={currentStatus === "rejected" ? "destructive" : "outline"}
        size="sm"
        onClick={() => setStatus("rejected")}
        disabled={pending !== null}
      >
        {pending === "rejected" ? (
          <Loader2 className="size-3.5 animate-spin mr-1" />
        ) : (
          <X className="size-3.5 mr-1" />
        )}
        Reject
      </Button>
    </div>
  )
}
