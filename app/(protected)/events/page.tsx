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

  const tierState = await getUserTier()
  const tier = tierState?.tier ?? null

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

  const [rsvpRes, replayRes] = await Promise.all([
    allEventIds.length
      ? supabase
          .from("live_event_rsvps")
          .select("event_id, rsvp_status")
          .eq("user_id", user.id)
          .in("event_id", allEventIds)
      : Promise.resolve({
          data: [] as Pick<LiveEventRsvpRow, "event_id" | "rsvp_status">[],
        }),
    pastEvents.length
      ? supabase
          .from("live_event_replays")
          .select("event_id")
          .in(
            "event_id",
            pastEvents.map((e) => e.id)
          )
      : Promise.resolve({
          data: [] as Pick<LiveEventReplayRow, "event_id">[],
        }),
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
      (r) => r.event_id
    )
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
    <div className="mx-auto max-w-5xl pb-10 text-[#4B3A25]">
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A6A22]">
          Daily Breathwork
        </p>

        <h1 className="font-serif text-3xl font-semibold text-[#4B3A25] sm:text-4xl">
          Live Sessions
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F7358]">
          Join live breathwork sessions, guided workshops, and access past
          practice replays when available.
        </p>
      </div>

      <div className="mb-6">
        <Suspense>
          <EventsFilter />
        </Suspense>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 border-l-2 border-[#C89B3C] pl-3 font-serif text-xl font-semibold text-[#4B3A25]">
          Upcoming Sessions
        </h2>

        {upcomingEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#C89B3C]/30 bg-[#F7F0E3]/70 px-4 py-8 text-center text-sm text-[#6F7358]">
            No upcoming sessions yet. Please check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      {/* <section>
        <h2 className="mb-4 border-l-2 border-[#6F7358]/40 pl-3 font-serif text-xl font-semibold text-[#4B3A25]">
          Past Sessions
        </h2>

        {pastEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#C89B3C]/30 bg-[#F7F0E3]/70 px-4 py-8 text-center text-sm text-[#6F7358]">
            No past sessions to show.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-[#C89B3C]/30 bg-[#F7F0E3] text-[#8A6A22] hover:bg-[#E8DDC8] hover:text-[#4B3A25]"
              >
                <Link href={buildPageHref(page - 1)}>Previous</Link>
              </Button>
            )}

            {morePastAvailable && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-[#C89B3C]/30 bg-[#F7F0E3] text-[#8A6A22] hover:bg-[#E8DDC8] hover:text-[#4B3A25]"
              >
                <Link href={buildPageHref(page + 1)}>Next</Link>
              </Button>
            )}
          </div>
        )}
      </section> */}
    </div>
  )
}