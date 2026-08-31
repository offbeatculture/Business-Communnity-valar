import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  fetchCheckinHistory,
  fetchCheckinQuestions,
  fetchStreak,
} from "@/lib/checkin-server"
import { addDays, istToday } from "@/lib/checkin"
import { Flame, CalendarCheck } from "lucide-react"

const WEEKS_SHOWN = 12
const DAYS_SHOWN = WEEKS_SHOWN * 7

export default async function PracticeHistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [history, streak, questions] = await Promise.all([
    fetchCheckinHistory(user.id, DAYS_SHOWN),
    fetchStreak(user.id),
    fetchCheckinQuestions(),
  ])

  const byDate = new Map(history.map((h) => [h.checkin_date, h]))
  const today = istToday()

  // Build the grid ending today, aligned so each column is one Mon–Sun week.
  const todayDow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  const lastDay = addDays(today, 6 - todayDow) // Sunday of the current week
  const firstDay = addDays(lastDay, -(DAYS_SHOWN - 1))

  const weeks: { iso: string; inFuture: boolean }[][] = []
  for (let w = 0; w < WEEKS_SHOWN; w++) {
    const col: { iso: string; inFuture: boolean }[] = []
    for (let d = 0; d < 7; d++) {
      const iso = addDays(firstDay, w * 7 + d)
      col.push({ iso, inFuture: iso > today })
    }
    weeks.push(col)
  }

  const totalDays = history.length
  const perfectDays = history.filter(
    (h) => h.total_count > 0 && h.yes_count === h.total_count
  ).length

  // Per-practice totals across the whole window.
  const practiceTotals = questions.map((q) => ({
    question: q,
    done: history.filter((h) => (h.answers as Record<string, boolean>)?.[q.id] === true).length,
  }))

  return (
    <div className="mx-auto w-full max-w-3xl pb-24 text-[#4B3A25] sm:pb-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#F7F0E3] px-3 py-1 text-xs font-medium text-[#8A6A22]">
          <CalendarCheck className="size-3.5" />
          Your practice
        </div>

        <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
          Practice history
        </h1>

        <p className="mt-1 text-sm font-medium text-[#6F7358]">
          Every day you have logged, over the last {WEEKS_SHOWN} weeks.
        </p>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Current streak"
          value={streak.current}
          icon={streak.current > 0}
        />
        <Stat label="Longest streak" value={streak.longest} />
        <Stat label="Days logged" value={totalDays} />
        <Stat label="All three done" value={perfectDays} />
      </div>

      {/* Calendar */}
      <div className="mb-6 rounded-3xl border border-[#C89B3C]/30 bg-[#F7F0E3] p-5">
        <h2 className="mb-4 font-serif text-lg font-semibold">Your days</h2>

        <div className="overflow-x-auto">
          <div className="flex gap-1">
            {weeks.map((col, i) => (
              <div key={i} className="flex flex-col gap-1">
                {col.map((cell) => {
                  const entry = byDate.get(cell.iso)
                  return (
                    <span
                      key={cell.iso}
                      title={
                        cell.inFuture
                          ? undefined
                          : entry
                            ? `${cell.iso} — ${entry.yes_count}/${entry.total_count}`
                            : `${cell.iso} — not logged`
                      }
                      className="size-3.5 rounded-[3px]"
                      style={{
                        backgroundColor: cell.inFuture
                          ? "transparent"
                          : cellColor(entry?.yes_count, entry?.total_count),
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-[#6F7358]">
          <span>Not logged</span>
          <span className="flex gap-1">
            {[undefined, 0, 1, 2, 3].map((n, i) => (
              <span
                key={i}
                className="size-3.5 rounded-[3px]"
                style={{ backgroundColor: cellColor(n, 3) }}
              />
            ))}
          </span>
          <span>All three</span>
        </div>
      </div>

      {/* Per practice */}
      <div className="rounded-3xl border border-[#C89B3C]/30 bg-[#F7F0E3] p-5">
        <h2 className="mb-4 font-serif text-lg font-semibold">By practice</h2>

        <div className="space-y-3.5">
          {practiceTotals.map(({ question, done }) => {
            const pct = totalDays > 0 ? Math.round((done / totalDays) * 100) : 0
            return (
              <div key={question.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">
                    {question.question_text}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {done}
                    <span className="font-normal text-[#6F7358]">
                      /{totalDays}
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#C89B3C]/15">
                  <div
                    className="h-full rounded-full bg-[#6F7358]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {totalDays === 0 && (
          <p className="text-sm font-medium text-[#6F7358]">
            Nothing logged yet. Your first check-in starts the record.
          </p>
        )}
      </div>
    </div>
  )
}

/** Sage green, deepening with how many practices were done that day. */
function cellColor(yes: number | undefined, total: number | undefined): string {
  if (yes === undefined || total === undefined) return "rgba(200,155,60,0.13)"
  if (total === 0) return "rgba(200,155,60,0.13)"

  const ratio = yes / total
  if (ratio === 0) return "rgba(111,115,88,0.28)"
  if (ratio <= 0.34) return "rgba(111,115,88,0.5)"
  if (ratio <= 0.67) return "rgba(111,115,88,0.72)"
  return "#5F7355"
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon?: boolean
}) {
  return (
    <div className="rounded-2xl border border-[#C89B3C]/25 bg-[#F7F0E3] p-3.5">
      <p className="text-xs font-medium text-[#6F7358]">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 font-serif text-2xl font-semibold tabular-nums">
        {icon && value > 0 && <Flame className="size-4 text-[#C89B3C]" />}
        {value}
      </p>
    </div>
  )
}
