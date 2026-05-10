// ============================================================
// EventDangerZone — surface the soft-cancel action on the edit page.
//
// Calling DELETE on the event endpoint sets status='cancelled' (it does
// NOT remove the row, since invoices and RSVPs reference it). After
// confirming, we send the user back to the events list.
// ============================================================
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"

type Props = {
  eventId: string
  alreadyCancelled: boolean
}

export function EventDangerZone({ eventId, alreadyCancelled }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to cancel event")
      }
      toast.success("Event cancelled")
      router.push("/admin/events")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel event",
      )
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
        disabled={alreadyCancelled}
      >
        <XCircle className="size-4 mr-2" />
        {alreadyCancelled ? "Already cancelled" : "Cancel event"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this event?</DialogTitle>
            <DialogDescription>
              Marks the event as cancelled. Members who RSVP-ed will see the
              cancelled status. The row is preserved in case any invoice or
              RSVP needs to reference it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep event
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 animate-spin mr-2" />}
              Cancel event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
