import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchWeeklyReview } from "@/lib/checkin-server"
import { formatWeekRange, addDays } from "@/lib/checkin"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Flame, Users } from "lucide-react"

type Props = {
  searchParams: Promise<{ week?: string }>
}

/** Mon–Sun column headers for the window. */
function weekDays(start: string): { iso: string; label: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(start, i)
    return {
      iso,
      label: new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
        weekday: "narrow",
        timeZone: "UTC",
      }),
    }
  })
}

export default async function PracticeReviewPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/dashboard")

  const { week } = await searchParams
  const offset = Math.min(0, Number.parseInt(week ?? "0", 10) || 0)

  const review = await fetchWeeklyReview(offset)
  const days = weekDays(review.window.start)

  const participation =
    review.totalMembers > 0
      ? Math.round((review.members.length / review.totalMembers) * 100)
      : 0

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Practice Review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who practised this week — for the Sunday call.
        </p>
      </div>

      {/* Week nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3">
        <div>
          <p className="text-sm font-semibold">{review.window.label}</p>
          <p className="text-xs text-muted-foreground">
            {formatWeekRange(review.window)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/admin/practice-review?week=${offset - 1}`}>
            <Button variant="outline" size="sm">
              <ChevronLeft className="size-4" />
              Earlier
            </Button>
          </Link>
          <Link href={`/admin/practice-review?week=${Math.min(0, offset + 1)}`}>
            <Button variant="outline" size="sm" disabled={offset >= 0}>
              Later
              <ChevronRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Members" value={review.totalMembers} />
        <Stat label="Practised" value={review.members.length} />
        <Stat label="Silent" value={review.silent.length} />
        <Stat label="Participation" value={`${participation}%`} />
      </div>

      {/* Active members */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Practised this week ({review.members.length})
        </h2>

        {review.members.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
            No check-ins logged in this week yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Member</th>
                  {days.map((d) => (
                    <th key={d.iso} className="p-2 text-center font-medium">
                      {d.label}
                    </th>
                  ))}
                  <th className="p-3 text-right font-medium">Days</th>
                  <th className="p-3 text-right font-medium">Streak</th>
                </tr>
              </thead>
              <tbody>
                {review.members.map((m) => {
                  const logged = new Set(m.dates)
                  return (
                    <tr key={m.userId} className="border-b border-border/40 last:border-0">
                      <td className="p-3 font-medium">{m.name}</td>

                      {days.map((d) => (
                        <td key={d.iso} className="p-2 text-center">
                          <span
                            className={`inline-block size-2.5 rounded-full ${
                              logged.has(d.iso)
                                ? "bg-green-500"
                                : "bg-muted-foreground/20"
                            }`}
                            title={d.iso}
                          />
                        </td>
                      ))}

                      <td className="p-3 text-right font-semibold tabular-nums">
                        {m.daysLogged}/7
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {m.currentStreak > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <Flame className="size-3.5" />
                            {m.currentStreak}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Per-practice totals */}
      {review.members.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold">By practice</h2>
          <div className="space-y-2">
            {review.questions.map((q) => {
              const done = review.members.reduce(
                (sum, m) => sum + (m.yesByQuestion[q.id] ?? 0),
                0
              )
              const possible = review.members.length * 7
              const pct = possible > 0 ? Math.round((done / possible) * 100) : 0

              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-border/60 bg-card p-3"
                >
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{q.question_text}</span>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {done} / {possible}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Silent members — the ones actually worth a call-out */}
      {review.silent.length > 0 && (
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
            <Users className="size-4" />
            No check-ins this week ({review.silent.length})
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            These members logged nothing in this window.
          </p>

          <div className="flex flex-wrap gap-2">
            {review.silent.map((m) => (
              <span
                key={m.userId}
                className="rounded-full border border-border/60 bg-card px-3 py-1 text-sm"
              >
                {m.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
