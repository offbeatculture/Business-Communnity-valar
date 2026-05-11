// ============================================================
// Community App — Live Events helpers (Phase 4)
//
// Shared helpers for the Workshop / AI Lab live events surface. These
// run on the server (Supabase server client + RLS) so they trust the
// row-level security policies created in
// supabase/migrations/20260510_workshop_and_ai_lab_tables.sql to
// hide rows the user does not have tier access to.
// ============================================================

import type { ProductTier } from "@/lib/plans"
import { getTierRank } from "@/lib/plans"

// ── Inline result types ──
// We keep these inline (no Supabase type regen) per the Phase 4 brief.

export type EventType = "workshop" | "ai_lab"

export type EventStatus = "scheduled" | "live" | "completed" | "cancelled"

export type RsvpStatus = "yes" | "maybe" | "no"

export type HotSeatStatus =
  | "pending"
  | "selected"
  | "rejected"
  | "withdrawn"

export type LiveEventRow = {
  id: string
  event_type: EventType
  title: string
  description: string | null
  starts_at: string
  duration_minutes: number
  meeting_url: string | null
  status: EventStatus
  min_tier_rank: number
  hot_seat_slots: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type LiveEventReplayRow = {
  id: string
  event_id: string
  event_type: EventType
  replay_url: string
  duration_seconds: number | null
  transcript_url: string | null
  published_at: string
  created_at: string
}

export type LiveEventRsvpRow = {
  id: string
  event_id: string
  user_id: string
  rsvp_status: RsvpStatus
  attended: boolean
  created_at: string
  updated_at: string
}

export type HotSeatApplicationRow = {
  id: string
  event_id: string
  user_id: string
  application_text: string
  numbers_summary: string | null
  status: HotSeatStatus
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

// ── IST formatters ──
// date-fns v4 ships locale-only tz; Intl is the simplest path to IST.
const IST = "Asia/Kolkata"

export function formatIstDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatIstDateShort(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

// ── Friendly status text for an event card ──
// "Live now" | "Starts in 3 days" | "Starts in 4 hours" | "Completed" | "Cancelled"
//
// Pass `nowMs` from the parent server component so this function stays pure.
export function eventStatusText(
  event: {
    starts_at: string
    status: EventStatus
  },
  nowMs: number,
): string {
  if (event.status === "live") return "Live now"
  if (event.status === "cancelled") return "Cancelled"
  if (event.status === "completed") return "Completed"

  const startsMs = new Date(event.starts_at).getTime()
  const diffMs = startsMs - nowMs
  if (diffMs <= 0) return "Starting now"

  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 60) return `Starts in ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Starts in ${hours} hour${hours === 1 ? "" : "s"}`
  const days = Math.round(hours / 24)
  return `Starts in ${days} day${days === 1 ? "" : "s"}`
}

// ── Event type display config ──
export const eventTypeConfig: Record<
  EventType,
  { label: string; className: string }
> = {
  workshop: {
    label: "Workshop",
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  ai_lab: {
    label: "AI Lab",
    className:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
}

// ── Required tier for an event (for upgrade copy) ──
export function requiredTierForEvent(eventType: EventType): ProductTier {
  return eventType === "workshop" ? "workshop" : "ai_lab"
}

export function userCanRsvp(
  userTier: ProductTier | null,
  event: { event_type: EventType; min_tier_rank: number },
): boolean {
  if (!userTier) return false
  return getTierRank(userTier) >= event.min_tier_rank
}
