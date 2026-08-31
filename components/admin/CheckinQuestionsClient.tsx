"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Eye, EyeOff } from "lucide-react"
import type { CheckinQuestion } from "@/lib/checkin"

type Props = {
  questions: CheckinQuestion[]
}

export function CheckinQuestionsClient({ questions }: Props) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [week, setWeek] = useState<string>("")
  const [busy, setBusy] = useState<string | null>(null)

  const standing = questions.filter((q) => q.week_number === null)
  const weekly = questions.filter((q) => q.week_number !== null)

  async function call(method: "POST" | "PATCH", body: unknown, key: string) {
    setBusy(key)
    try {
      const res = await fetch("/api/admin/checkin-questions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const isJson = res.headers.get("content-type")?.includes("application/json")
      if (!isJson) {
        toast.error("Your session has expired. Please sign in again.")
        router.push("/login")
        return false
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Request failed")

      router.refresh()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
      return false
    } finally {
      setBusy(null)
    }
  }

  async function addQuestion() {
    if (!text.trim()) return
    const ok = await call(
      "POST",
      {
        question_text: text.trim(),
        week_number: week ? Number(week) : null,
        sort_order: (week ? weekly.length : standing.length) + 1,
      },
      "new",
    )
    if (ok) {
      toast.success("Question added")
      setText("")
      setWeek("")
    }
  }

  async function toggleActive(q: CheckinQuestion) {
    const ok = await call("PATCH", { id: q.id, is_active: !q.is_active }, q.id)
    if (ok) toast.success(q.is_active ? "Question hidden" : "Question shown")
  }

  return (
    <div className="space-y-6">
      {/* Add */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Add a question</h2>

        <div className="space-y-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Did you do your 4-7-8 breathwork practice?"
            maxLength={300}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-muted-foreground">
              Show it
              <select
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                className="ml-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="">Every day (standing)</option>
                <option value="1">Week 1 · Annamaya only</option>
                <option value="2">Week 2 · Pranamaya only</option>
                <option value="3">Week 3 · Manomaya only</option>
                <option value="4">Week 4 · Vijnanamaya only</option>
                <option value="5">Week 5 · Anandamaya only</option>
              </select>
            </label>

            <Button
              onClick={addQuestion}
              disabled={!text.trim() || busy === "new"}
              size="sm"
            >
              {busy === "new" ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1 size-4" />
              )}
              Add
            </Button>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Week-specific questions replace the standing set during that week.
          Weekly rotation is not wired up yet — for now, standing questions are
          what members see.
        </p>
      </div>

      <QuestionList
        title="Standing questions — shown every day"
        questions={standing}
        busy={busy}
        onToggle={toggleActive}
      />

      {weekly.length > 0 && (
        <QuestionList
          title="Week-specific questions"
          questions={weekly}
          busy={busy}
          onToggle={toggleActive}
          showWeek
        />
      )}
    </div>
  )
}

function QuestionList({
  title,
  questions,
  busy,
  onToggle,
  showWeek,
}: {
  title: string
  questions: CheckinQuestion[]
  busy: string | null
  onToggle: (q: CheckinQuestion) => void
  showWeek?: boolean
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>

      {questions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {questions.map((q) => (
            <li
              key={q.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 ${
                q.is_active ? "" : "opacity-55"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{q.question_text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Position {q.sort_order}
                  {showWeek && q.week_number ? ` · Week ${q.week_number}` : ""}
                  {q.is_active ? "" : " · hidden"}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggle(q)}
                disabled={busy === q.id}
              >
                {busy === q.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : q.is_active ? (
                  <>
                    <EyeOff className="mr-1 size-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="mr-1 size-4" />
                    Show
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
