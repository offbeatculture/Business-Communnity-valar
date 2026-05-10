// ============================================================
// EventForm — shared client form for creating and editing live events.
//
// Used by both /admin/events/new (create) and /admin/events/[id] (edit).
// On create, posts to POST /api/admin/events. On edit, sends PATCH to
// /api/admin/events/[id].
// ============================================================
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

export type EventFormValues = {
  event_type: "workshop" | "ai_lab"
  title: string
  description: string
  starts_at: string // <input type="datetime-local"> shape: YYYY-MM-DDTHH:mm
  duration_minutes: number
  meeting_url: string
  status: "scheduled" | "live" | "completed" | "cancelled"
  hot_seat_slots: number
}

type Props = {
  // When editing, eventId is set and event_type becomes immutable.
  mode: "create" | "edit"
  eventId?: string
  initial: EventFormValues
}

// Convert a datetime-local string ("YYYY-MM-DDTHH:mm") to an ISO-8601 string
// the API and DB can store. We treat the local input as local time.
function toIsoString(localValue: string): string {
  // new Date("YYYY-MM-DDTHH:mm") interprets the value as local time, which
  // is what the user typed in. .toISOString() converts to UTC for storage.
  const d = new Date(localValue)
  return d.toISOString()
}

export function EventForm({ mode, eventId, initial }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<EventFormValues>(initial)
  const [saving, setSaving] = useState(false)

  function update<K extends keyof EventFormValues>(
    key: K,
    value: EventFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!values.title.trim()) {
      toast.error("Title is required")
      return
    }
    if (!values.starts_at) {
      toast.error("Start time is required")
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: values.title,
        description: values.description || null,
        starts_at: toIsoString(values.starts_at),
        duration_minutes: values.duration_minutes,
        meeting_url: values.meeting_url || null,
        status: values.status,
      }

      // Only send event_type and hot_seat_slots on create. event_type is
      // immutable on edit, and hot_seat_slots is only meaningful for
      // workshops.
      if (mode === "create") {
        payload.event_type = values.event_type
      }
      if (values.event_type === "workshop") {
        payload.hot_seat_slots = values.hot_seat_slots
      }

      const url =
        mode === "create"
          ? "/api/admin/events"
          : `/api/admin/events/${eventId}`
      const method = mode === "create" ? "POST" : "PATCH"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to save event")
      }

      const saved = await res.json()
      toast.success(
        mode === "create" ? "Event scheduled" : "Event updated",
      )

      if (mode === "create" && saved?.id) {
        router.push(`/admin/events/${saved.id}`)
      } else {
        router.refresh()
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save event",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Event type</label>
        {mode === "edit" ? (
          // event_type is immutable on edit per the spec — render a read-only
          // pill instead of the radio.
          <p className="text-sm">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {values.event_type === "workshop" ? "Workshop" : "AI Lab event"}
            </span>
            <span className="text-muted-foreground text-xs ml-2">
              (cannot be changed after creation)
            </span>
          </p>
        ) : (
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="event_type"
                value="workshop"
                checked={values.event_type === "workshop"}
                onChange={() => update("event_type", "workshop")}
              />
              Workshop
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="event_type"
                value="ai_lab"
                checked={values.event_type === "ai_lab"}
                onChange={() => update("event_type", "ai_lab")}
              />
              AI Lab event
            </label>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Title</label>
        <Input
          value={values.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. Pricing teardown — May edition"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">
          Description (optional)
        </label>
        <Textarea
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
          placeholder="What members will learn or get out of this event."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Starts at (your local time)
          </label>
          <Input
            type="datetime-local"
            value={values.starts_at}
            onChange={(e) => update("starts_at", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Duration (minutes)
          </label>
          <Input
            type="number"
            min={1}
            value={values.duration_minutes}
            onChange={(e) =>
              update(
                "duration_minutes",
                Number.isFinite(parseInt(e.target.value, 10))
                  ? parseInt(e.target.value, 10)
                  : 0,
              )
            }
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">
          Meeting URL (optional)
        </label>
        <Input
          type="url"
          value={values.meeting_url}
          onChange={(e) => update("meeting_url", e.target.value)}
          placeholder="https://zoom.us/j/..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          You can paste this closer to the event. Members see it once they
          have RSVP-ed yes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Status</label>
          <Select
            value={values.status}
            onValueChange={(v) =>
              update("status", v as EventFormValues["status"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {values.event_type === "workshop" && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Hot-seat slots
            </label>
            <Input
              type="number"
              min={0}
              value={values.hot_seat_slots}
              onChange={(e) =>
                update(
                  "hot_seat_slots",
                  Number.isFinite(parseInt(e.target.value, 10))
                    ? parseInt(e.target.value, 10)
                    : 0,
                )
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Number of members who can present a number / problem live.
              Defaults to 3.
            </p>
          </div>
        )}
      </div>

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? (
          <Loader2 className="size-4 animate-spin mr-2" />
        ) : (
          <Save className="size-4 mr-2" />
        )}
        {mode === "create" ? "Schedule event" : "Save changes"}
      </Button>
    </form>
  )
}
