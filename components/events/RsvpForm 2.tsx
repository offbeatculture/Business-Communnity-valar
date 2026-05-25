"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, HelpCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Status = "yes" | "maybe" | "no"

interface RsvpFormProps {
  eventId: string
  initialStatus: Status | null
  disabled?: boolean
  disabledReason?: string
}

const options: {
  value: Status
  label: string
  icon: typeof Check
  activeClass: string
}[] = [
  {
    value: "yes",
    label: "Going",
    icon: Check,
    activeClass: "bg-primary text-primary-foreground border-primary",
  },
  {
    value: "maybe",
    label: "Maybe",
    icon: HelpCircle,
    activeClass:
      "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/40",
  },
  {
    value: "no",
    label: "Not going",
    icon: X,
    activeClass: "bg-muted text-foreground border-border",
  },
]

export function RsvpForm({
  eventId,
  initialStatus,
  disabled,
  disabledReason,
}: RsvpFormProps) {
  const router = useRouter()
  const [status, setStatus] = useState<Status | null>(initialStatus)
  const [isPending, startTransition] = useTransition()

  const handleClick = (next: Status) => {
    if (disabled || isPending) return
    const previous = status
    setStatus(next)

    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rsvp_status: next }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? "Failed to update RSVP")
        }
        toast.success(
          next === "yes"
            ? "RSVP confirmed — see you there"
            : next === "maybe"
              ? "Marked as maybe"
              : "Marked as not going",
        )
        router.refresh()
      } catch (err) {
        setStatus(previous)
        toast.error(
          err instanceof Error ? err.message : "Failed to update RSVP",
        )
      }
    })
  }

  const handleClear = () => {
    if (disabled || isPending || !status) return
    const previous = status
    setStatus(null)

    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/rsvp`, {
          method: "DELETE",
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? "Failed to clear RSVP")
        }
        toast.success("RSVP cleared")
        router.refresh()
      } catch (err) {
        setStatus(previous)
        toast.error(
          err instanceof Error ? err.message : "Failed to clear RSVP",
        )
      }
    })
  }

  if (disabled) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {disabledReason ?? "RSVP unavailable on your current tier."}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const Icon = opt.icon
          const isActive = status === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              disabled={isPending}
              onClick={() => handleClick(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                isActive
                  ? opt.activeClass
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent/50",
                isPending && "opacity-60",
              )}
            >
              <Icon className="size-3.5" />
              {opt.label}
            </button>
          )
        })}
      </div>
      {status && (
        <button
          type="button"
          onClick={handleClear}
          disabled={isPending}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Clear RSVP
        </button>
      )}
    </div>
  )
}
