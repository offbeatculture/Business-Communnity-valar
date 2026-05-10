// ============================================================
// Admin Events List — Phase 4 of the three-tier system.
//
// Server component. Lists every row in `live_events`, with filters by
// event_type and status driven by URL search params. CTAs at the top jump
// to the create page with type pre-set.
// ============================================================
import Link from "next/link"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pencil, Plus, Sparkles, Calendar } from "lucide-react"

type EventTypeFilter = "all" | "workshop" | "ai_lab"
type StatusFilter = "all" | "scheduled" | "live" | "completed" | "cancelled"

type LiveEventRow = {
  id: string
  event_type: "workshop" | "ai_lab"
  title: string
  starts_at: string
  status: "scheduled" | "live" | "completed" | "cancelled"
  hot_seat_slots: number
}

type EventTableRow = LiveEventRow & {
  rsvp_count: number
  has_replay: boolean
}

const STATUS_BADGE: Record<StatusFilter, string> = {
  all: "",
  scheduled: "bg-blue-500/10 text-blue-500",
  live: "bg-green-500/10 text-green-500",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
}

function isEventTypeFilter(v: string | undefined): v is EventTypeFilter {
  return v === "all" || v === "workshop" || v === "ai_lab" || v === undefined
}

function isStatusFilter(v: string | undefined): v is StatusFilter {
  return (
    v === "all" ||
    v === "scheduled" ||
    v === "live" ||
    v === "completed" ||
    v === "cancelled" ||
    v === undefined
  )
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>
}) {
  // Admin layout already does role gating, but we double-check here so
  // a direct fetch (curl, scraper) can never bypass via a misconfigured
  // route group.
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

  const { type: rawType, status: rawStatus } = await searchParams
  const typeFilter: EventTypeFilter = isEventTypeFilter(rawType)
    ? (rawType ?? "all")
    : "all"
  const statusFilter: StatusFilter = isStatusFilter(rawStatus)
    ? (rawStatus ?? "all")
    : "all"

  const admin = createAdminClient()

  // Build the events query — newest first by start time so future events
  // surface naturally above past ones.
  let q = admin
    .from("live_events")
    .select(
      "id, event_type, title, starts_at, status, hot_seat_slots",
    )
    .order("starts_at", { ascending: false })
  if (typeFilter !== "all") q = q.eq("event_type", typeFilter)
  if (statusFilter !== "all") q = q.eq("status", statusFilter)

  const { data: rawEvents } = await q
  const events = (rawEvents ?? []) as unknown as LiveEventRow[]

  // Fetch RSVP counts and replay-existence flags in parallel for the rows
  // we are about to render. We do simple per-event queries because the row
  // count is small (tens, not thousands) and joining via a view would
  // require a schema change. If this page ever shows hundreds of rows,
  // replace with a single grouped query.
  const enriched: EventTableRow[] = await Promise.all(
    events.map(async (e) => {
      const [{ count: rsvpCount }, { data: replayRow }] = await Promise.all([
        admin
          .from("live_event_rsvps")
          .select("id", { count: "exact", head: true })
          .eq("event_id", e.id)
          .eq("rsvp_status", "yes"),
        admin
          .from("live_event_replays")
          .select("id")
          .eq("event_id", e.id)
          .limit(1)
          .maybeSingle(),
      ])
      return {
        ...e,
        rsvp_count: rsvpCount ?? 0,
        has_replay: !!replayRow,
      }
    }),
  )

  function buildHref(
    next: Partial<{ type: EventTypeFilter; status: StatusFilter }>,
  ) {
    const sp = new URLSearchParams()
    const finalType = next.type ?? typeFilter
    const finalStatus = next.status ?? statusFilter
    if (finalType !== "all") sp.set("type", finalType)
    if (finalStatus !== "all") sp.set("status", finalStatus)
    const qs = sp.toString()
    return qs ? `/admin/events?${qs}` : "/admin/events"
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Live Events</h1>
          <p className="text-muted-foreground text-sm">
            Schedule workshops and AI Lab sessions, manage replays, and review
            hot-seat applications.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/events/new?type=workshop">
              <Calendar className="size-4 mr-1" />
              Schedule Workshop
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/events/new?type=ai_lab">
              <Sparkles className="size-4 mr-1" />
              Schedule AI Lab event
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Type
            </p>
            <div className="flex flex-wrap gap-2">
              {(["all", "workshop", "ai_lab"] as EventTypeFilter[]).map((t) => (
                <Link
                  key={t}
                  href={buildHref({ type: t })}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                    (typeFilter === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground hover:text-foreground")
                  }
                >
                  {t === "all"
                    ? "All"
                    : t === "workshop"
                      ? "Workshop"
                      : "AI Lab"}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "all",
                  "scheduled",
                  "live",
                  "completed",
                  "cancelled",
                ] as StatusFilter[]
              ).map((s) => (
                <Link
                  key={s}
                  href={buildHref({ status: s })}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors " +
                    (statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground hover:text-foreground")
                  }
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events ({enriched.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {enriched.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No events match the current filters. Use the buttons above to
              schedule one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-muted-foreground font-medium">
                      Type
                    </th>
                    <th className="text-left py-2 text-muted-foreground font-medium">
                      Title
                    </th>
                    <th className="text-left py-2 text-muted-foreground font-medium hidden md:table-cell">
                      Starts
                    </th>
                    <th className="text-center py-2 text-muted-foreground font-medium">
                      Status
                    </th>
                    <th className="text-center py-2 text-muted-foreground font-medium hidden sm:table-cell">
                      RSVPs
                    </th>
                    <th className="text-center py-2 text-muted-foreground font-medium hidden md:table-cell">
                      Replay
                    </th>
                    <th className="text-right py-2 text-muted-foreground font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enriched.map((event) => (
                    <tr key={event.id} className="border-b last:border-0">
                      <td className="py-3">
                        {event.event_type === "workshop" ? (
                          <Badge
                            variant="secondary"
                            className="bg-blue-500/10 text-blue-500"
                          >
                            Workshop
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-purple-500/10 text-purple-500"
                          >
                            AI Lab
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 max-w-[260px] truncate font-medium">
                        {event.title}
                      </td>
                      <td className="py-3 hidden md:table-cell text-muted-foreground tabular-nums">
                        {format(new Date(event.starts_at), "d MMM yyyy, h:mm a")}
                      </td>
                      <td className="py-3 text-center">
                        <Badge
                          variant="secondary"
                          className={
                            STATUS_BADGE[event.status as StatusFilter] ?? ""
                          }
                        >
                          {event.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-center tabular-nums hidden sm:table-cell">
                        {event.rsvp_count}
                      </td>
                      <td className="py-3 text-center hidden md:table-cell">
                        {event.has_replay ? (
                          <Badge
                            variant="secondary"
                            className="bg-green-500/10 text-green-500"
                          >
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Button asChild variant="ghost" size="icon-xs">
                          <Link href={`/admin/events/${event.id}`}>
                            <Pencil className="size-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
        <Plus className="size-3" />
        Tip: schedule events early so members have time to RSVP and apply for
        hot seats.
      </p>
    </div>
  )
}
