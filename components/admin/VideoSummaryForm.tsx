"use client"

import { useEffect, useState } from "react"
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
import { Loader2, Sparkles, Save, Plus, X, FolderPlus } from "lucide-react"
import { toast } from "sonner"
import type { Category } from "@/types"

type Props = {
  categories: Category[]
  onSuccess: () => void
}

type ContentFolder = {
  id: string
  name: string
  slug: string
  description: string | null
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

  const [folders, setFolders] = useState<ContentFolder[]>([])
  const [folderId, setFolderId] = useState("")
  const [loadingFolders, setLoadingFolders] = useState(false)

  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderDescription, setNewFolderDescription] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)

  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [category, setCategory] = useState("")
  const [saving, setSaving] = useState(false)

  const [manualTranscript, setManualTranscript] = useState("")
  const [showTranscript, setShowTranscript] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [summary, setSummary] = useState<GeneratedSummary | null>(null)

  const [title, setTitle] = useState("")
  const [takeaway, setTakeaway] = useState("")
  const [fullSummary, setFullSummary] = useState("")
  const [keyPoints, setKeyPoints] = useState<
    { point: string; timestamp?: string }[]
  >([])
  const [actionItems, setActionItems] = useState<string[]>([])
  const [videoDuration, setVideoDuration] = useState("")
  const [readTime, setReadTime] = useState("")

  useEffect(() => {
    fetchFolders()
  }, [])

  async function fetchFolders() {
    setLoadingFolders(true)

    try {
      const res = await fetch("/api/admin/content-folders")

      if (!res.ok) {
        throw new Error("Failed to load folders")
      }

      const data = await res.json()
      setFolders(data.data ?? [])
    } catch {
      console.error("Failed to fetch content folders")
    } finally {
      setLoadingFolders(false)
    }
  }

  function resetForm() {
    setYoutubeUrl("")
    setManualTranscript("")
    setShowTranscript(false)
    setCategory("")
    setFolderId("")
    setSummary(null)
    setTitle("")
    setTakeaway("")
    setFullSummary("")
    setKeyPoints([])
    setActionItems([])
    setVideoDuration("")
    setReadTime("")
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) {
      toast.error("Folder name is required")
      return
    }

    setCreatingFolder(true)

    try {
      const res = await fetch("/api/admin/content-folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          description: newFolderDescription.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create folder")
      }

      toast.success("Folder created")

      const createdFolder = data.data as ContentFolder

      setFolders((current) => [createdFolder, ...current])
      setFolderId(createdFolder.id)
      setNewFolderName("")
      setNewFolderDescription("")
      setShowCreateFolder(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create folder"
      )
    } finally {
      setCreatingFolder(false)
    }
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
        headers: {
          "Content-Type": "application/json",
        },
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
      setKeyPoints(data.key_points ?? [])
      setActionItems(data.action_items ?? [])
      setVideoDuration(
        data.video_duration_minutes ? String(data.video_duration_minutes) : ""
      )
      setReadTime(data.read_time_minutes ? String(data.read_time_minutes) : "")

      toast.success("Summary generated. Review and edit below.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      )
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!youtubeUrl) {
      toast.error("Please enter a YouTube URL")
      return
    }

    if (!title.trim()) {
      toast.error("Please enter a title")
      return
    }

    if (!folderId) {
      toast.error("Please select or create a folder")
      return
    }

    // if (!category) {
    //   toast.error("Please select a category")
    //   return
    // }

    if (mode === "ai" && !summary) {
      toast.error("Please generate a summary first")
      return
    }

    setSaving(true)

    try {
      const videoId = summary?.youtube_video_id ?? extractVideoId(youtubeUrl)

      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content_type: "video_summary",
          folder_id: folderId,
          title: title.trim(),
          youtube_url: youtubeUrl.trim(),
          youtube_video_id: videoId,
          category: "recordings",
          video_duration_minutes: videoDuration
            ? Number(videoDuration)
            : summary?.video_duration_minutes ?? undefined,
          read_time_minutes: readTime
            ? Number(readTime)
            : summary?.read_time_minutes ?? undefined,
          one_line_takeaway: takeaway.trim() || undefined,
          key_points: keyPoints.length > 0 ? keyPoints : undefined,
          action_items: actionItems.length > 0 ? actionItems : undefined,
          full_summary: fullSummary.trim() || undefined,
          is_published: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to save")
      }

      toast.success("Video published")
      resetForm()
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "ai" | "manual")}>
        <TabsList>
          <TabsTrigger value="ai">
            <Sparkles className="mr-1.5 size-3.5" />
            AI Generate
          </TabsTrigger>

          <TabsTrigger value="manual">
            <Save className="mr-1.5 size-3.5" />
            Manual Entry
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div>
        <label className="mb-1.5 block text-sm font-medium">YouTube URL</label>
        <div className="flex flex-col gap-2 sm:flex-row">
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
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              {generating ? "Generating..." : "Generate"}
            </Button>
          )}
        </div>
      </div>

      {mode === "ai" && showTranscript && !summary && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Manual Transcript
          </label>
          <Textarea
            value={manualTranscript}
            onChange={(e) => setManualTranscript(e.target.value)}
            placeholder="Paste the video transcript here..."
            rows={6}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Paste the transcript and click Generate again.
          </p>
        </div>
      )}

      {(mode === "manual" || summary) && (
        <>
          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <label className="block text-sm font-medium">Folder</label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Choose where this video should appear in recordings.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowCreateFolder((value) => !value)}
              >
                <FolderPlus className="mr-1.5 size-4" />
                New folder
              </Button>
            </div>

            <Select
              value={folderId}
              onValueChange={setFolderId}
              disabled={loadingFolders}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    loadingFolders ? "Loading folders..." : "Select folder"
                  }
                />
              </SelectTrigger>

              <SelectContent>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showCreateFolder && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Folder Name
                  </label>
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Morning Breathwork"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Folder Description
                  </label>
                  <Textarea
                    value={newFolderDescription}
                    onChange={(e) => setNewFolderDescription(e.target.value)}
                    placeholder="Short description for this folder"
                    rows={2}
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={creatingFolder}
                >
                  {creatingFolder && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Create and Select Folder
                </Button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title or summary headline"
            />
          </div>
{/* 
          <div>
            <label className="mb-1.5 block text-sm font-medium">Category</label>
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
          </div> */}

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              One-Line Takeaway
            </label>
            <Input
              value={takeaway}
              onChange={(e) => setTakeaway(e.target.value)}
              placeholder="The single most important insight from this video"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
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
                          idx === i
                            ? {
                                ...p,
                                timestamp: e.target.value || undefined,
                              }
                            : p
                        )
                      )
                    }
                    placeholder="0:00"
                    className="w-24"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setKeyPoints((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                  >
                    <X className="size-4 text-destructive" />
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
                <Plus className="mr-1 size-4" />
                Add key point
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Action Items ({actionItems.length})
            </label>

            <div className="space-y-2">
              {actionItems.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) =>
                      setActionItems((prev) =>
                        prev.map((p, idx) =>
                          idx === i ? e.target.value : p
                        )
                      )
                    }
                    placeholder={`Action item ${i + 1}`}
                    className="flex-1"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setActionItems((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                  >
                    <X className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActionItems((prev) => [...prev, ""])}
              >
                <Plus className="mr-1 size-4" />
                Add action item
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Full Summary
            </label>
            <Textarea
              value={fullSummary}
              onChange={(e) => setFullSummary(e.target.value)}
              placeholder="2-3 paragraph summary of the video content"
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Video Duration (min)
              </label>
              <Input
                value={videoDuration}
                onChange={(e) => setVideoDuration(e.target.value)}
                placeholder="e.g. 15"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Read Time (min)
              </label>
              <Input
                value={readTime}
                onChange={(e) => setReadTime(e.target.value)}
                placeholder="e.g. 3"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Publish Video
            </Button>
          </div>
        </>
      )}
    </div>
  )
}