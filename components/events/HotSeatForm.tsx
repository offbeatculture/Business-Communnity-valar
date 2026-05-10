"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface HotSeatFormProps {
  eventId: string
}

const MIN_LENGTH = 50

export function HotSeatForm({ eventId }: HotSeatFormProps) {
  const router = useRouter()
  const [applicationText, setApplicationText] = useState("")
  const [numbersSummary, setNumbersSummary] = useState("")
  const [isPending, startTransition] = useTransition()

  const tooShort = applicationText.trim().length < MIN_LENGTH
  const remaining = Math.max(0, MIN_LENGTH - applicationText.trim().length)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tooShort || isPending) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            application_text: applicationText.trim(),
            numbers_summary: numbersSummary.trim() || null,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? "Failed to submit application")
        }
        toast.success("Application submitted — we will email if selected")
        router.push(`/events/${eventId}`)
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to submit application",
        )
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="application_text"
          className="block text-sm font-medium mb-1.5"
        >
          Why this hot seat?
          <span className="text-destructive ml-0.5">*</span>
        </label>
        <Textarea
          id="application_text"
          value={applicationText}
          onChange={(e) => setApplicationText(e.target.value)}
          placeholder="What is the decision, blocker, or question you want analysed live? Be specific — the more context, the better the session."
          rows={6}
          required
          minLength={MIN_LENGTH}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {tooShort
            ? `Add ${remaining} more character${remaining === 1 ? "" : "s"} (min ${MIN_LENGTH}).`
            : "Looks good."}
        </p>
      </div>

      <div>
        <label
          htmlFor="numbers_summary"
          className="block text-sm font-medium mb-1.5"
        >
          Numbers or specifics{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          id="numbers_summary"
          value={numbersSummary}
          onChange={(e) => setNumbersSummary(e.target.value)}
          placeholder="What numbers or specifics do you want analysed live? (P&L, pricing, hiring decision, stuck thread, etc.)"
          rows={4}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={tooShort || isPending}>
          {isPending ? "Submitting..." : "Submit application"}
        </Button>
        <Button
          asChild
          variant="outline"
          type="button"
          disabled={isPending}
        >
          <a href={`/events/${eventId}`}>Cancel</a>
        </Button>
      </div>
    </form>
  )
}
