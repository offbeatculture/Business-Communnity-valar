import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import {
  formatIstDateTime,
  getActiveUserTier,
  userCanRsvp,
  type HotSeatApplicationRow,
  type LiveEventRow,
} from "@/lib/events"
import { TIER_LABELS } from "@/lib/plans"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HotSeatForm } from "@/components/events/HotSeatForm"
import { HotSeatApplicationView } from "@/components/events/HotSeatApplicationView"

type Props = {
  params: Promise<{ id: string }>
}

export default async function HotSeatApplyPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: event } = await supabase
    .from("live_events")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-xl font-semibold mb-2">Event not available</h1>
        <p className="text-muted-foreground text-sm mb-6">
          This event is not available on your tier, or it does not exist.
        </p>
        <Button asChild variant="outline">
          <Link href="/events">Back to events</Link>
        </Button>
      </div>
    )
  }

  const eventRow = event as LiveEventRow

  // Hot seats are workshop-only by product rule (DB trigger enforces too).
  if (eventRow.event_type !== "workshop") {
    redirect(`/events/${eventRow.id}`)
  }

  const isPast =
    eventRow.status === "completed" ||
    new Date(eventRow.starts_at).getTime() < new Date().getTime()
  const isCancelled = eventRow.status === "cancelled"

  const { tier } = await getActiveUserTier(user.id)
  const canApply = userCanRsvp(tier, eventRow)

  const { data: existing } = await supabase
    .from("hot_seat_applications")
    .select("*")
    .eq("event_id", eventRow.id)
    .eq("user_id", user.id)
    .maybeSingle()

  const application = existing as HotSeatApplicationRow | null

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <Link
        href={`/events/${eventRow.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to event
      </Link>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
          Hot seat application
        </p>
        <h1 className="text-2xl font-bold leading-tight">{eventRow.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {formatIstDateTime(eventRow.starts_at)} IST •{" "}
          {eventRow.hot_seat_slots} hot-seat slot
          {eventRow.hot_seat_slots === 1 ? "" : "s"}
        </p>
      </div>

      {isCancelled ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            This event was cancelled — applications are closed.
          </CardContent>
        </Card>
      ) : isPast ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            This workshop has already happened. Applications are closed.
          </CardContent>
        </Card>
      ) : application ? (
        <HotSeatApplicationView
          eventId={eventRow.id}
          application={application}
        />
      ) : !canApply ? (
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Hot seat applications are open to {TIER_LABELS.workshop} tier
              members and above.
            </p>
            <Button asChild size="sm">
              <Link href="/subscription">Upgrade to Workshop</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5">
            <HotSeatForm eventId={eventRow.id} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
