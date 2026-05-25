"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { HotSeatApplicationRow } from "@/lib/events"

interface Props {
  eventId: string
  application: HotSeatApplicationRow
}

const statusLabel: Record<HotSeatApplicationRow["status"], string> = {
  pending: "Pending review",
  selected: "Selected",
  rejected: "Not selected this time",
  withdrawn: "Withdrawn",
}

const statusClass: Record<HotSeatApplicationRow["status"], string> = {
  pending: "text-yellow-600 dark:text-yellow-400",
  selected: "text-primary",
  rejected: "text-destructive",
  withdrawn: "text-muted-foreground",
}

export function HotSeatApplicationView({ eventId, application }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const canWithdraw = application.status === "pending"

  const handleWithdraw = () => {
    if (!canWithdraw || isPending) return
    if (
      !window.confirm(
        "Withdraw this hot-seat application? You can re-apply if slots remain.",
      )
    ) {
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/apply`, {
          method: "DELETE",
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? "Failed to withdraw")
        }
        toast.success("Application withdrawn")
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to withdraw",
        )
      }
    })
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Status
          </p>
          <p
            className={cn(
              "text-base font-semibold",
              statusClass[application.status],
            )}
          >
            {statusLabel[application.status]}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Why this hot seat
          </p>
          <p className="text-sm whitespace-pre-wrap">
            {application.application_text}
          </p>
        </div>

        {application.numbers_summary && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Numbers / specifics
            </p>
            <p className="text-sm whitespace-pre-wrap">
              {application.numbers_summary}
            </p>
          </div>
        )}

        {canWithdraw && (
          <div className="pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={handleWithdraw}
              disabled={isPending}
            >
              {isPending ? "Withdrawing..." : "Withdraw application"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
