import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Users,
  Video,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUserTier } from "@/lib/auth/tier"
import {
  eventTypeConfig,
  eventStatusText,
  formatIstDateTime,
  requiredTierForEvent,
  userCanRsvp,
  type HotSeatApplicationRow,
  type LiveEventReplayRow,
  type LiveEventRow,
  type LiveEventRsvpRow,
} from "@/lib/events"
import { TIER_LABELS } from "@/lib/plans"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RsvpForm } from "@/components/events/RsvpForm"
import { cn } from "@/lib/utils"

type Props = {
  params: Promise<{ id: string }>
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Resolve tier first — we need it both for RSVP gating below AND to
  // decide between the tier-locked soft denial and a real 404 when the
  // event query returns null.
  // getUserTier returns null for unauthenticated or no-active-subscription
  // users; userCanRsvp accepts a null tier and correctly returns false.
  const tierState = await getUserTier()
  const tier = tierState?.tier ?? null
  const userTierRank = tierState?.tierRank ?? 0

  // RLS will hide events the user has no tier access to → returns null.
  const { data: event, error } = await supabase
    .from("live_events")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !event) {
    // Discriminate tier-locked from real-404:
    //   - User has rank < 3 → most likely RLS hid an AI Lab event from
    //     them. Render a soft denial that nudges to upgrade. Worst case
    //     it is a genuine garbage URL and we mislabel it as tier-locked,
    //     which is acceptable trade-off (no real harm; the upgrade link
    //     still routes to /subscription).
    //   - User has rank 3 (AI Lab) → they can see every event already,
    //     so a null result is a genuine 404.
    const isTierLocked = userTierRank < 3

    if (isTierLocked) {
      return (
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Badge
            variant="outline"
            className="mb-4 bg-gradient-to-r from-[#E53935] to-[#FF6D00] text-white border-transparent"
          >
            AI Lab tier
          </Badge>
          <h1 className="text-xl font-semibold mb-2">
            This event is on AI Lab tier.
          </h1>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            AI Lab events are exclusive to AI Lab tier members and not
            available to your current tier.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/events">Back to events</Link>
            </Button>
            <Button asChild>
              <Link href="/subscription">Upgrade to AI Lab →</Link>
            </Button>
          </div>
        </div>
      )
    }

    // Real 404 — AI Lab member who navigated to a non-existent event id.
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-xl font-semibold mb-2">Event not found</h1>
        <p className="text-muted-foreground text-sm mb-6">
          We could not find this event. It may have been removed.
        </p>
        <Button asChild variant="outline">
          <Link href="/events">Back to events</Link>
        </Button>
      </div>
    )
  }

  const eventRow = event as LiveEventRow
  const cfg = eventTypeConfig[eventRow.event_type]
  const nowMs = new Date().getTime()
  const isPast =
    eventRow.status === "completed" ||
    new Date(eventRow.starts_at).getTime() < nowMs
  const isCancelled = eventRow.status === "cancelled"
  const statusText = eventStatusText(eventRow, nowMs)

  const canRsvpForTier = userCanRsvp(tier, eventRow)

  // Parallel queries for the rest of the page.
  const [rsvpRes, attendeeCountRes, replayRes, applicationRes] =
    await Promise.all([
      supabase
        .from("live_event_rsvps")
        .select("rsvp_status")
        .eq("event_id", eventRow.id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("live_event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventRow.id)
        .eq("rsvp_status", "yes"),
      isPast
        ? supabase
            .from("live_event_replays")
            .select("*")
            .eq("event_id", eventRow.id)
            .order("published_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      eventRow.event_type === "workshop"
        ? supabase
            .from("hot_seat_applications")
            .select("*")
            .eq("event_id", eventRow.id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  const userRsvp = rsvpRes.data as Pick<LiveEventRsvpRow, "rsvp_status"> | null
  const attendeeCount = attendeeCountRes.count ?? 0
  const replay = replayRes.data as LiveEventReplayRow | null
  const application = applicationRes.data as HotSeatApplicationRow | null

  // Meeting URL only shown when user RSVPed yes AND tier sufficient.
  const showMeetingUrl =
    !isPast &&
    !isCancelled &&
    canRsvpForTier &&
    userRsvp?.rsvp_status === "yes" &&
    !!eventRow.meeting_url

  const requiredTier = requiredTierForEvent(eventRow.event_type)
  const requiredLabel = TIER_LABELS[requiredTier]

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to events
      </Link>

      {/* Hero */}
      <Card className="mb-6 overflow-hidden border-border/60">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <Badge variant="outline" className={cn("border", cfg.className)}>
              {cfg.label}
            </Badge>
            <span
              className={cn(
                "text-xs font-medium",
                eventRow.status === "live" && "text-red-500",
                isCancelled && "text-muted-foreground line-through",
                eventRow.status !== "live" && !isCancelled && "text-muted-foreground",
              )}
            >
              {eventRow.status === "live" && (
                <span className="inline-block size-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />
              )}
              {statusText}
            </span>
          </div>

          <h1 className="text-2xl font-bold leading-tight">{eventRow.title}</h1>

          {eventRow.description && (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">
              {eventRow.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground pt-2 border-t border-border/40">
            <span className="inline-flex items-center gap-2">
              <Calendar className="size-4" />
              {formatIstDateTime(eventRow.starts_at)} IST
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4" />
              {eventRow.duration_minutes} minutes
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="size-4" />
              {attendeeCount} going
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Past event: replay */}
      {isPast && (
        <section className="mb-6">
          <h2 className="text-base font-semibold mb-3 border-l-2 border-primary pl-3">
            Replay
          </h2>
          {replay ? (
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-4">
                {/*
                  Stub: simple iframe player. Replace with a richer player
                  (e.g. video.js, mux) when the replay pipeline lands.
                */}
                <div className="aspect-video w-full bg-black rounded-md overflow-hidden">
                  <iframe
                    src={replay.replay_url}
                    title={`${eventRow.title} replay`}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {replay.transcript_url && (
                    <a
                      href={replay.transcript_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <FileText className="size-4" />
                      View transcript
                    </a>
                  )}
                  <a
                    href={replay.replay_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="size-4" />
                    Open in new tab
                  </a>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground">
              <Video className="size-4 inline mr-1.5" />
              Replay coming soon. Check back after the team uploads it.
            </div>
          )}
        </section>
      )}

      {/* Upcoming event: RSVP + join + hot seat */}
      {!isPast && !isCancelled && (
        <section className="mb-6">
          <h2 className="text-base font-semibold mb-3 border-l-2 border-primary pl-3">
            Your RSVP
          </h2>
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-4">
              <RsvpForm
                eventId={eventRow.id}
                initialStatus={userRsvp?.rsvp_status ?? null}
                disabled={!canRsvpForTier}
                disabledReason={`This event requires the ${requiredLabel} tier. Upgrade to RSVP.`}
              />

              {showMeetingUrl && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Join link</p>
                    <p className="text-xs text-muted-foreground">
                      Available because you RSVPed yes. Save it now.
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <a
                      href={eventRow.meeting_url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Join event
                      <ExternalLink className="size-3.5 ml-1" />
                    </a>
                  </Button>
                </div>
              )}

              {!canRsvpForTier && (
                <div>
                  <Button asChild size="sm" variant="default">
                    <Link href="/subscription">
                      Upgrade to {requiredLabel}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Hot seat application — workshops only */}
      {eventRow.event_type === "workshop" &&
        !isPast &&
        !isCancelled &&
        eventRow.hot_seat_slots > 0 && (
          <section className="mb-6">
            <h2 className="text-base font-semibold mb-3 border-l-2 border-primary pl-3">
              Hot seat ({eventRow.hot_seat_slots} slots)
            </h2>
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-3">
                {application ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">
                      Status:{" "}
                      <span
                        className={cn(
                          application.status === "selected" &&
                            "text-primary",
                          application.status === "rejected" &&
                            "text-destructive",
                          application.status === "withdrawn" &&
                            "text-muted-foreground",
                        )}
                      >
                        {application.status === "pending"
                          ? "Pending review"
                          : application.status === "selected"
                            ? "Selected"
                            : application.status === "rejected"
                              ? "Not selected"
                              : "Withdrawn"}
                      </span>
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/events/${eventRow.id}/apply`}>
                        View application
                      </Link>
                    </Button>
                  </div>
                ) : canRsvpForTier ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Apply for a hot seat to get your numbers, pricing, or
                      stuck thread analysed live.
                    </p>
                    <Button asChild size="sm">
                      <Link href={`/events/${eventRow.id}/apply`}>
                        Apply for hot seat
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Hot seat applications are open to {requiredLabel} tier
                    members and above.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        )}

      {/* Cancelled */}
      {isCancelled && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          This event has been cancelled. Replays may still be added if a
          recording is available.
        </div>
      )}
    </div>
  )
}
