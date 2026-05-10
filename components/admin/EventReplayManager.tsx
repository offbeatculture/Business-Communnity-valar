// ============================================================
// EventReplayManager — admin form to attach a replay to a live event.
//
// Posts to POST /api/admin/events/[id]/replay. The parent page passes in
// `existingReplay` if a replay already exists; we still allow the admin to
// post another replay row (e.g. to swap a wrong URL) — the API just
// inserts. Cleanup of stale replay rows is a separate concern.
// ============================================================
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Upload, Video } from "lucide-react"
import { toast } from "sonner"

type ExistingReplay = {
  id: string
  replay_url: string
  duration_seconds: number | null
  transcript_url: string | null
  published_at: string | null
} | null

type Props = {
  eventId: string
  existingReplay: ExistingReplay
}

// datetime-local input shape for "now" — admin can override.
function nowLocal(): string {
  const d = new Date()
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

export function EventReplayManager({ eventId, existingReplay }: Props) {
  const router = useRouter()
  const [replayUrl, setReplayUrl] = useState(existingReplay?.replay_url ?? "")
  const [transcriptUrl, setTranscriptUrl] = useState(
    existingReplay?.transcript_url ?? "",
  )
  const [durationSeconds, setDurationSeconds] = useState<string>(
    existingReplay?.duration_seconds
      ? String(existingReplay.duration_seconds)
      : "",
  )
  const [publishedAt, setPublishedAt] = useState<string>(nowLocal())
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!replayUrl.trim()) {
      toast.error("Replay URL is required")
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        replay_url: replayUrl,
        transcript_url: transcriptUrl || null,
      }
      if (durationSeconds) {
        const n = parseInt(durationSeconds, 10)
        if (Number.isFinite(n) && n > 0) payload.duration_seconds = n
      }
      // datetime-local -> ISO. If the field is empty the API defaults to now.
      if (publishedAt) {
        payload.published_at = new Date(publishedAt).toISOString()
      }

      const res = await fetch(`/api/admin/events/${eventId}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to save replay")
      }

      toast.success("Replay saved")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save replay",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {existingReplay && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <Video className="size-4 text-muted-foreground" />
            <span className="font-medium">Current replay</span>
          </div>
          <p className="text-muted-foreground text-xs break-all">
            {existingReplay.replay_url}
          </p>
          {existingReplay.published_at && (
            <p className="text-muted-foreground text-xs mt-1">
              Published {new Date(existingReplay.published_at).toLocaleString()}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Submitting below adds another replay row. Use only if you need to
            swap the URL.
          </p>
        </div>
      )}

      <div>
        <label className="text-sm font-medium mb-1.5 block">Replay URL</label>
        <Input
          type="url"
          value={replayUrl}
          onChange={(e) => setReplayUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Duration (seconds, optional)
          </label>
          <Input
            type="number"
            min={1}
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(e.target.value)}
            placeholder="e.g. 5400"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Published at
          </label>
          <Input
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Defaults to now. The 30-day Library delay starts from this date.
          </p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">
          Transcript URL (optional)
        </label>
        <Input
          type="url"
          value={transcriptUrl}
          onChange={(e) => setTranscriptUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? (
          <Loader2 className="size-4 animate-spin mr-2" />
        ) : (
          <Upload className="size-4 mr-2" />
        )}
        Save replay
      </Button>
    </form>
  )
}
