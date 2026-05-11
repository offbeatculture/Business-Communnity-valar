import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserTier } from "@/lib/auth/tier"
import type {
  EventType,
  LiveEventRow,
  LiveEventReplayRow,
  LiveEventRsvpRow,
} from "@/lib/events"
import { EventCard } from "@/components/events/EventCard"
import { EventsFilter } from "@/components/events/EventsFilter"
import { TierBanner } from "@/components/events/TierBanner"
import { AiLabUpsellCard } from "@/components/events/AiLabUpsellCard"
import { Button } from "@/components/ui/button"

const PAST_PAGE_SIZE = 20

type Props = {
  searchParams: Promise<{
    type?: string
    page?: string
  }>
}

export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const typeFilter: EventType | null =
    params.type === "workshop" || params.type === "ai_lab"
      ? params.type
      : null

  const page = Math.max(1, Number(params.page ?? "1") || 1)
  const pastFrom = (page - 1) * PAST_PAGE_SIZE
  const pastTo = pastFrom + PAST_PAGE_SIZE - 1

  const now = new Date()
  const nowIso = now.toISOString()
  const nowMs = now.getTime()

  // Tier (drives the banner — RLS still hides rows the user cannot see).
  // getUserTier returns null when there is no active subscription; the
  // TierBanner accepts a null tier and renders the "no active sub" state.
  const tierState = await getUserTier()
  const tier = tierState?.tier ?? null

  // Build base queries; RLS filters them per the access matrix.
  let upcomingQuery = supabase
    .from("live_events")
    .select("*")
    .gte("starts_at", nowIso)
    .in("status", ["scheduled", "live"])
    .order("starts_at", { ascending: true })
    .limit(50)

  let pastQuery = supabase
    .from("live_events")
    .select("*")
    .or(`starts_at.lt.${nowIso},status.eq.completed`)
    .order("starts_at", { ascending: false })
    .range(pastFrom, pastTo)

  if (typeFilter) {
    upcomingQuery = upcomingQuery.eq("event_type", typeFilter)
    pastQuery = pastQuery.eq("event_type", typeFilter)
  }

  const [upcomingRes, pastRes] = await Promise.all([upcomingQuery, pastQuery])

  const upcomingEvents = (upcomingRes.data ?? []) as LiveEventRow[]
  const pastEvents = (pastRes.data ?? []) as LiveEventRow[]

  const allEventIds = [
    ...upcomingEvents.map((e) => e.id),
    ...pastEvents.map((e) => e.id),
  ]

  // RSVPs for upcoming, replay rows for past — both single-shot batch reads.
  const [rsvpRes, replayRes] = await Promise.all([
    allEventIds.length
      ? supabase
          .from("live_event_rsvps")
          .select("event_id, rsvp_status")
          .eq("user_id", user.id)
          .in("event_id", allEventIds)
      : Promise.resolve({ data: [] as Pick<LiveEventRsvpRow, "event_id" | "rsvp_status">[] }),
    pastEvents.length
      ? supabase
          .from("live_event_replays")
          .select("event_id")
          .in(
            "event_id",
            pastEvents.map((e) => e.id),
          )
      : Promise.resolve({ data: [] as Pick<LiveEventReplayRow, "event_id">[] }),
  ])

  const rsvpMap = new Map<string, "yes" | "maybe" | "no">()
  for (const r of (rsvpRes.data ?? []) as Pick<
    LiveEventRsvpRow,
    "event_id" | "rsvp_status"
  >[]) {
    rsvpMap.set(r.event_id, r.rsvp_status)
  }

  const replaySet = new Set<string>(
    ((replayRes.data ?? []) as Pick<LiveEventReplayRow, "event_id">[]).map(
      (r) => r.event_id,
    ),
  )

  const morePastAvailable = pastEvents.length === PAST_PAGE_SIZE
  const buildPageHref = (p: number) => {
    const sp = new URLSearchParams()
    if (typeFilter) sp.set("type", typeFilter)
    if (p > 1) sp.set("page", String(p))
    const q = sp.toString()
    return q ? `/events?${q}` : "/events"
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="mb-2">
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-muted-foreground text-sm">
          Live workshops and AI Lab sessions. Hot-seat applications are open
          for upcoming workshops.
        </p>
      </div>

      <div className="mt-5 mb-5">
        <TierBanner userTier={tier} />
      </div>

      <div className="mb-6">
        <Suspense>
          <EventsFilter />
        </Suspense>
      </div>

      {/* Upcoming */}
      <section className="mb-10">
        <h2 className="border-l-2 border-primary pl-3 text-base font-semibold mb-4">
          Upcoming
        </h2>
        {upcomingEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-8 text-center text-sm text-muted-foreground">
            No upcoming events on your tier yet. Check back soon, or upgrade
            to unlock more.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                userRsvpStatus={rsvpMap.get(event.id) ?? null}
                nowMs={nowMs}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      <section>
        <h2 className="border-l-2 border-muted-foreground/40 pl-3 text-base font-semibold mb-4">
          Past events
        </h2>
        {pastEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-8 text-center text-sm text-muted-foreground">
            No past events to show.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pastEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                hasReplayAccess={replaySet.has(event.id)}
                nowMs={nowMs}
              />
            ))}
          </div>
        )}

        {(page > 1 || morePastAvailable) && (
          <div className="mt-6 flex items-center justify-center gap-3">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildPageHref(page - 1)}>Previous</Link>
              </Button>
            )}
            {morePastAvailable && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildPageHref(page + 1)}>Next</Link>
              </Button>
            )}
          </div>
        )}
      </section>

      {/*
        AI Lab upsell card. Renders only for active Library and Workshop
        members; AI Lab members and unsubscribed users are skipped (the
        latter are already nudged by the top-of-page TierBanner).
      */}
      <AiLabUpsellCard userTier={tier} />
    </div>
  )
}
