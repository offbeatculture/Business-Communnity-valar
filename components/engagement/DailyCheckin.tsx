"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Check, X, Flame, Loader2, Sparkles } from "lucide-react"
import { checkinGP, type CheckinQuestion, type DailyCheckin, type StreakInfo } from "@/lib/checkin"

type Props = {
  questions: CheckinQuestion[]
  today: DailyCheckin | null
  streak: StreakInfo
}

export function DailyCheckinCard({ questions, today, streak }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, boolean>>(
    () => (today?.answers as Record<string, boolean>) ?? {}
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editing, setEditing] = useState(!today)

  const allAnswered = questions.every((q) => q.id in answers)
  const yesCount = questions.filter((q) => answers[q.id] === true).length

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })

      // An expired session is redirected to /login by middleware, so this
      // resolves to the login page's HTML. Parsing it as JSON would throw
      // "Unexpected token '<'" and surface as a nonsense error.
      const isJson = res.headers
        .get("content-type")
        ?.includes("application/json")

      if (!isJson) {
        toast.error("Your session has expired. Please sign in again.")
        router.push("/login")
        return
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")

      toast.success(
        data.first_today
          ? `Logged for today. +${data.award?.gp_earned ?? 0} points`
          : "Today's check-in updated."
      )
      setEditing(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your check-in")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (questions.length === 0) return null

  return (
    <div className="rounded-3xl border border-[#C89B3C]/30 bg-[#F7F0E3] p-5 text-[#4B3A25] sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#8A6A22]">
            Today&apos;s practice
          </p>
          <h2 className="mt-1 font-serif text-xl font-semibold">
            Daily check-in
          </h2>
        </div>

        {/* The streak is the natural doorway into the history view — the
            mobile nav only has four slots, so this is how members get there. */}
        <Link
          href="/practice"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#C89B3C]/40 bg-[#C89B3C]/10 px-3 py-1 text-xs font-bold text-[#8A6A22] transition-colors hover:bg-[#C89B3C]/20"
        >
          <Flame className="size-3.5" />
          {streak.current > 0
            ? `${streak.current} day${streak.current === 1 ? "" : "s"}`
            : "Your practice"}
        </Link>
      </div>

      {/* Completed, not editing */}
      {today && !editing ? (
        <div>
          <div className="space-y-2.5">
            {questions.map((q) => {
              const done = answers[q.id] === true
              return (
                <div key={q.id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                      done
                        ? "bg-[#6F7358] text-white"
                        : "bg-[#C89B3C]/15 text-[#8A6A22]"
                    }`}
                  >
                    {done ? <Check className="size-3" /> : <X className="size-3" />}
                  </span>
                  <p className="text-sm font-medium leading-6">{q.question_text}</p>
                </div>
              )
            })}
          </div>

          <p className="mt-4 text-sm font-medium leading-6 text-[#6F7358]">
            {closingLine(yesCount, questions.length)}
          </p>

          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => setEditing(true)}
          >
            Update today&apos;s check-in
          </Button>
        </div>
      ) : (
        <div>
          <div className="space-y-3">
            {questions.map((q) => {
              const value = answers[q.id]
              return (
                <div
                  key={q.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C89B3C]/20 bg-white/60 p-3.5"
                >
                  <p className="min-w-0 flex-1 text-sm font-medium leading-6">
                    {q.question_text}
                  </p>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setAnswers((p) => ({ ...p, [q.id]: true }))}
                      aria-pressed={value === true}
                      className={`flex h-9 w-16 items-center justify-center gap-1 rounded-lg border text-xs font-bold transition-all ${
                        value === true
                          ? "border-[#4F5A3D] bg-[#4F5A3D] text-white"
                          : "border-[#6F7358]/30 bg-white text-[#59603F] hover:border-[#6F7358]/60"
                      }`}
                    >
                      <Check className="size-3.5" />
                      Yes
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnswers((p) => ({ ...p, [q.id]: false }))}
                      aria-pressed={value === false}
                      className={`flex h-9 w-16 items-center justify-center gap-1 rounded-lg border text-xs font-bold transition-all ${
                        value === false
                          ? "border-[#8A6A22] bg-[#8A6A22] text-white"
                          : "border-[#C89B3C]/35 bg-white text-[#8A6A22] hover:border-[#C89B3C]/70"
                      }`}
                    >
                      <X className="size-3.5" />
                      No
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            className="mt-4 w-full bg-[#C89B3C] text-white hover:bg-[#B4882F]"
          >
            {isSubmitting ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 size-4" />
            )}
            {today ? "Update check-in" : `Log today · +${checkinGP(yesCount)} points`}
          </Button>

          <p className="mt-2 text-center text-xs font-medium text-[#6F7358]">
            An honest &ldquo;no&rdquo; still counts. Showing up is the practice.
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Wellbeing platform, not a productivity tracker — a light day gets
 * encouragement, never a rebuke.
 */
function closingLine(yes: number, total: number): string {
  if (yes === total) return "All three, done. That is a complete day."
  if (yes === 0) return "Logged. Tomorrow is a fresh start — the streak lives on showing up."
  return `${yes} of ${total} today. That still counts.`
}
