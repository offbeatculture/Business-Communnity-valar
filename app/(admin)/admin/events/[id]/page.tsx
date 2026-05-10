// ============================================================
// Admin — Edit a live event + manage its replay + see hot-seat applications.
//
// Server component. Loads the event row, the most-recent replay (if any),
// and a summary of hot-seat applications. event_type is NOT editable here
// (handled inside EventForm).
// ============================================================
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Users } from "lucide-react"
import { EventForm, type EventFormValues } from "@/components/admin/EventForm"
import { EventReplayManager } from "@/components/admin/EventReplayManager"
import { EventDangerZone } from "@/components/admin/EventDangerZone"

type LiveEventRow = {
  id: string
  event_type: "workshop" | "ai_lab"
  title: string
  description: string | null
  starts_at: string
  duration_minutes: number
  meeting_url: string | null
  status: "scheduled" | "live" | "completed" | "cancelled"
  hot_seat_slots: number
}

type ReplayRow = {
  id: string
  replay_url: string
  duration_seconds: number | null
  transcript_url: string | null
  published_at: string | null
}

// Convert an ISO-8601 timestamp to the "YYYY-MM-DDTHH:mm" shape that
// <input type="datetime-local"> expects. Done in local time.
function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  )
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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

  const { id } = await params
  const admin = createAdminClient()

  const { data: rawEvent } = await admin
    .from("live_events")
    .select(
      "id, event_type, title, description, starts_at, duration_minutes, meeting_url, status, hot_seat_slots",
    )
    .eq("id", id)
    .single()

  if (!rawEvent) notFound()

  const event = rawEvent as unknown as LiveEventRow

  // Most-recent replay row (if any) for this event.
  const { data: rawReplay } = await admin
    .from("live_event_replays")
    .select(
      "id, replay_url, duration_seconds, transcript_url, published_at",
    )
    .eq("event_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const replay = (rawReplay as unknown as ReplayRow | null) ?? null

  // Hot-seat application summary by status — shown only for workshops.
  let pendingCount = 0
  let selectedCount = 0
  let rejectedCount = 0
  if (event.event_type === "workshop") {
    const [pending, selected, rejected] = await Promise.all([
      admin
        .from("hot_seat_applications")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "pending"),
      admin
        .from("hot_seat_applications")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "selected"),
      admin
        .from("hot_seat_applications")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "rejected"),
    ])
    pendingCount = pending.count ?? 0
    selectedCount = selected.count ?? 0
    rejectedCount = rejected.count ?? 0
  }

  const initial: EventFormValues = {
    event_type: event.event_type,
    title: event.title,
    description: event.description ?? "",
    starts_at: isoToLocalInput(event.starts_at),
    duration_minutes: event.duration_minutes,
    meeting_url: event.meeting_url ?? "",
    status: event.status,
    hot_seat_slots: event.hot_seat_slots,
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link href="/admin/events">
            <ChevronLeft className="size-4 mr-1" />
            Back to events
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <Badge variant="secondary" className="capitalize">
            {event.status}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {format(new Date(event.starts_at), "EEEE, d MMMM yyyy 'at' h:mm a")}
          {" "}· {event.duration_minutes} min
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event details</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm mode="edit" eventId={event.id} initial={initial} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Replay</CardTitle>
        </CardHeader>
        <CardContent>
          <EventReplayManager
            eventId={event.id}
            existingReplay={replay}
          />
        </CardContent>
      </Card>

      {event.event_type === "workshop" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                Hot-seat applications
              </CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/events/${event.id}/applications`}>
                  Review applications
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold tabular-nums">
                  {pendingCount}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold tabular-nums text-green-500">
                  {selectedCount}
                </p>
                <p className="text-xs text-muted-foreground">Selected</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold tabular-nums text-muted-foreground">
                  {rejectedCount}
                </p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {event.hot_seat_slots} hot-seat slot
              {event.hot_seat_slots === 1 ? "" : "s"} available for this event.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Cancelling marks this event as cancelled but preserves the row so
            invoices and RSVPs remain intact.
          </p>
          <EventDangerZone
            eventId={event.id}
            alreadyCancelled={event.status === "cancelled"}
          />
        </CardContent>
      </Card>
    </div>
  )
}
