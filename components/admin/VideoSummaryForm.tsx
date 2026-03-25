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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Sparkles, Save, Plus, X } from "lucide-react"
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

function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null
    }
    if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com"
    ) {
      if (parsed.searchParams.has("v")) {
        return parsed.searchParams.get("v")
      }
      const match = parsed.pathname.match(/^\/(embed|shorts)\/([^/?]+)/)
      if (match) return match[2]
    }
    return null
  } catch {
    return null
  }
}

export function VideoSummaryForm({ categories, onSuccess }: Props) {
  const [mode, setMode] = useState<"ai" | "manual">("ai")

  // Shared state
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [category, setCategory] = useState("")
  const [saving, setSaving] = useState(false)

  // AI mode state
  const [manualTranscript, setManualTranscript] = useState("")
  const [showTranscript, setShowTranscript] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [summary, setSummary] = useState<GeneratedSummary | null>(null)

  // Editable fields (used by both modes after AI generation or in manual mode)
  const [title, setTitle] = useState("")
  const [takeaway, setTakeaway] = useState("")
  const [fullSummary, setFullSummary] = useState("")
  const [keyPoints, setKeyPoints] = useState<{ point: string; timestamp?: string }[]>([])
  const [actionItems, setActionItems] = useState<string[]>([])
  const [videoDuration, setVideoDuration] = useState("")
  const [readTime, setReadTime] = useState("")

  function resetForm() {
    setYoutubeUrl("")
    setManualTranscript("")
    setShowTranscript(false)
    setCategory("")
    setSummary(null)
    setTitle("")
    setTakeaway("")
    setFullSummary("")
    setKeyPoints([])
    setActionItems([])
    setVideoDuration("")
    setReadTime("")
  }

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
      setKeyPoints(data.key_points)
      setActionItems(data.action_items)
      toast.success("Summary generated! Review and edit below.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!youtubeUrl) {
      toast.error("Please enter a YouTube URL")
      return
    }
    if (!title) {
      toast.error("Please enter a title")
      return
    }
    if (!category) {
      toast.error("Please select a category")
      return
    }

    // In AI mode, require summary to be generated first
    if (mode === "ai" && !summary) {
      toast.error("Please generate a summary first")
      return
    }

    setSaving(true)

    try {
      const videoId = summary?.youtube_video_id ?? extractVideoId(youtubeUrl)

      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: "video_summary",
          title,
          youtube_url: youtubeUrl,
          youtube_video_id: videoId,
          category,
          video_duration_minutes: videoDuration ? Number(videoDuration) : (summary?.video_duration_minutes ?? undefined),
          read_time_minutes: readTime ? Number(readTime) : (summary?.read_time_minutes ?? undefined),
          one_line_takeaway: takeaway || undefined,
          key_points: keyPoints.length > 0 ? keyPoints : undefined,
          action_items: actionItems.length > 0 ? actionItems : undefined,
          full_summary: fullSummary || undefined,
          is_published: true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save")
      }

      toast.success("Video summary published!")
      resetForm()
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as "ai" | "manual")}>
        <TabsList>
          <TabsTrigger value="ai">
            <Sparkles className="size-3.5 mr-1.5" />
            AI Generate
          </TabsTrigger>
          <TabsTrigger value="manual">
            <Save className="size-3.5 mr-1.5" />
            Manual Entry
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* YouTube URL — shared by both modes */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">YouTube URL</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={generating}
          />
          {mode === "ai" && (
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
          )}
        </div>
      </div>

      {/* AI mode: Manual transcript fallback */}
      {mode === "ai" && showTranscript && !summary && (
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

      {/* Show editable fields: always in manual mode, after generation in AI mode */}
      {(mode === "manual" || summary) && (
        <>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title or summary headline"
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
              placeholder="The single most important insight from this video"
            />
          </div>

          {/* Key Points — editable dynamic list */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Key Points ({keyPoints.length})
            </label>
            <div className="space-y-2">
              {keyPoints.map((kp, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={kp.point}
                    onChange={(e) =>
                      setKeyPoints((prev) =>
                        prev.map((p, idx) =>
                          idx === i ? { ...p, point: e.target.value } : p
                        )
                      )
                    }
                    placeholder={`Key point ${i + 1}`}
                    className="flex-1"
                  />
                  <Input
                    value={kp.timestamp ?? ""}
                    onChange={(e) =>
                      setKeyPoints((prev) =>
                        prev.map((p, idx) =>
                          idx === i ? { ...p, timestamp: e.target.value || undefined } : p
                        )
                      )
                    }
                    placeholder="0:00"
                    className="w-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      setKeyPoints((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    <X className="size-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setKeyPoints((prev) => [...prev, { point: "" }])
                }
              >
                <Plus className="size-4 mr-1" />
                Add key point
              </Button>
            </div>
          </div>

          {/* Action Items — editable dynamic list */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Action Items ({actionItems.length})
            </label>
            <div className="space-y-2">
              {actionItems.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) =>
                      setActionItems((prev) =>
                        prev.map((a, idx) =>
                          idx === i ? e.target.value : a
                        )
                      )
                    }
                    placeholder={`Action item ${i + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      setActionItems((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    <X className="size-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActionItems((prev) => [...prev, ""])}
              >
                <Plus className="size-4 mr-1" />
                Add action item
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Full Summary
            </label>
            <Textarea
              value={fullSummary}
              onChange={(e) => setFullSummary(e.target.value)}
              placeholder="2-3 paragraph summary of the video content"
              rows={8}
            />
          </div>

          {/* Duration & Read Time — shown in manual mode, or editable after AI gen */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Video Duration (min)
              </label>
              <Input
                type="number"
                value={videoDuration || (summary?.video_duration_minutes ?? "")}
                onChange={(e) => setVideoDuration(e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Read Time (min)
              </label>
              <Input
                type="number"
                value={readTime || (summary?.read_time_minutes ?? "")}
                onChange={(e) => setReadTime(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !category || !title}
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
