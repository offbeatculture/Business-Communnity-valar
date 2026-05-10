import Link from "next/link"
import { Calendar, Clock, Users, Video } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  eventTypeConfig,
  eventStatusText,
  formatIstDateShort,
  type LiveEventRow,
} from "@/lib/events"
import { cn } from "@/lib/utils"

interface EventCardProps {
  event: LiveEventRow
  // RSVP info for upcoming events (server-loaded). Null for past events.
  userRsvpStatus?: "yes" | "maybe" | "no" | null
  // Whether a replay row exists for past events (RLS-filtered).
  hasReplayAccess?: boolean
  // "Now" in ms passed by the parent server component so the EventCard
  // stays a pure function of its props (lint: no impure calls in render).
  nowMs: number
}

export function EventCard({
  event,
  userRsvpStatus,
  hasReplayAccess,
  nowMs,
}: EventCardProps) {
  const cfg = eventTypeConfig[event.event_type]
  const isPast =
    event.status === "completed" ||
    new Date(event.starts_at).getTime() < nowMs

  const statusText = eventStatusText(event, nowMs)
  const isLive = event.status === "live"
  const isCancelled = event.status === "cancelled"

  // Truncate description to two lines visually via Tailwind line-clamp.
  return (
    <Link href={`/events/${event.id}`} className="block group">
      <Card className="h-full border-border/60 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <Badge
              variant="outline"
              className={cn("border", cfg.className)}
            >
              {cfg.label}
            </Badge>
            <span
              className={cn(
                "text-xs font-medium",
                isLive && "text-red-500",
                isCancelled && "text-muted-foreground line-through",
                !isLive && !isCancelled && "text-muted-foreground",
              )}
            >
              {isLive && (
                <span className="inline-block size-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />
              )}
              {statusText}
            </span>
          </div>

          <div>
            <h3 className="text-base font-semibold leading-tight group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {event.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {formatIstDateShort(event.starts_at)} IST
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {event.duration_minutes} min
            </span>
            {event.event_type === "workshop" && event.hot_seat_slots > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" />
                {event.hot_seat_slots} hot-seat slots
              </span>
            )}
          </div>

          {/* CTA row */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-sm">
            {isPast ? (
              hasReplayAccess ? (
                <span className="inline-flex items-center gap-1.5 text-primary font-medium">
                  <Video className="size-4" /> Watch replay
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">
                  Replay coming soon
                </span>
              )
            ) : userRsvpStatus === "yes" ? (
              <span className="text-primary font-medium text-xs">
                You are going
              </span>
            ) : userRsvpStatus === "maybe" ? (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium text-xs">
                RSVP: Maybe
              </span>
            ) : userRsvpStatus === "no" ? (
              <span className="text-muted-foreground text-xs">
                RSVP: Not attending
              </span>
            ) : (
              <span className="text-primary font-medium text-xs">
                RSVP for this event
              </span>
            )}
            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
              View details →
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
