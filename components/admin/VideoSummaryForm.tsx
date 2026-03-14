"use client"

import { useState } from "react"
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
import { Loader2, Sparkles, Save } from "lucide-react"
import { toast } from "sonner"
import type { Category } from "@/types"

type Props = {
  categories: Category[]
  onSuccess: () => void
}

type GeneratedSummary = {
  title: string
  youtube_url: string
  youtube_video_id: string | null
  one_line_takeaway: string
  key_points: { point: string; timestamp?: string }[]
  action_items: string[]
  full_summary: string
  read_time_minutes: number
  video_duration_minutes?: number
}

export function VideoSummaryForm({ categories, onSuccess }: Props) {
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [manualTranscript, setManualTranscript] = useState("")
  const [showTranscript, setShowTranscript] = useState(false)
  const [category, setCategory] = useState("")
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<GeneratedSummary | null>(null)

  // Editable fields after generation
  const [title, setTitle] = useState("")
  const [takeaway, setTakeaway] = useState("")
  const [fullSummary, setFullSummary] = useState("")

  async function handleGenerate() {
    if (!youtubeUrl) {
      toast.error("Please enter a YouTube URL")
      return
    }

    setGenerating(true)

    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_url: youtubeUrl,
          manual_transcript: manualTranscript || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === "no_transcript") {
          setShowTranscript(true)
          toast.error(data.message)
          return
        }
        throw new Error(data.error || "Failed to generate")
      }

      setSummary(data)
      setTitle(data.title)
      setTakeaway(data.one_line_takeaway)
      setFullSummary(data.full_summary)
      toast.success("Summary generated! Review and edit below.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!summary || !category) {
      toast.error("Please select a category")
      return
    }

    setSaving(true)

    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: "video_summary",
          title,
          youtube_url: summary.youtube_url,
          youtube_video_id: summary.youtube_video_id,
          category,
          video_duration_minutes: summary.video_duration_minutes,
          read_time_minutes: summary.read_time_minutes,
          one_line_takeaway: takeaway,
          key_points: summary.key_points,
          action_items: summary.action_items,
          full_summary: fullSummary,
          is_published: true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save")
      }

      toast.success("Video summary published!")
      // Reset form
      setYoutubeUrl("")
      setManualTranscript("")
      setShowTranscript(false)
      setCategory("")
      setSummary(null)
      setTitle("")
      setTakeaway("")
      setFullSummary("")
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Step 1: YouTube URL + Generate */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">YouTube URL</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={generating}
          />
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !youtubeUrl}
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="size-4 mr-2" />
            )}
            {generating ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>

      {/* Manual transcript fallback */}
      {showTranscript && !summary && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Manual Transcript
          </label>
          <Textarea
            value={manualTranscript}
            onChange={(e) => setManualTranscript(e.target.value)}
            placeholder="Paste the video transcript here..."
            rows={6}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Paste the transcript and click Generate again.
          </p>
        </div>
      )}

      {/* Step 2: Edit generated summary */}
      {summary && (
        <>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              One-Line Takeaway
            </label>
            <Input
              value={takeaway}
              onChange={(e) => setTakeaway(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Key Points ({summary.key_points.length})
            </label>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {summary.key_points.map((kp, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-foreground">{i + 1}.</span>
                  {kp.point}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Action Items ({summary.action_items.length})
            </label>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {summary.action_items.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-foreground">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Full Summary
            </label>
            <Textarea
              value={fullSummary}
              onChange={(e) => setFullSummary(e.target.value)}
              rows={8}
            />
          </div>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !category}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            {saving ? "Publishing..." : "Publish Video Summary"}
          </Button>
        </>
      )}
    </div>
  )
}
