"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, Loader2, SkipForward, Upload, XCircle } from "lucide-react"
import { toast } from "sonner"

type ContentFolder = {
  id: string
  name: string
}

type Outcome = {
  youtube_url: string
  status: "created" | "skipped" | "failed"
  title?: string
  reason?: string
}

const MAX_VIDEOS = 50

export function BulkVideoForm({ onSuccess }: { onSuccess?: () => void }) {
  const [folders, setFolders] = useState<ContentFolder[]>([])
  const [folderId, setFolderId] = useState("")
  const [urlsText, setUrlsText] = useState("")
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState<Outcome[] | null>(null)

  useEffect(() => {
    async function loadFolders() {
      try {
        const res = await fetch("/api/admin/content-folders")
        if (!res.ok) return

        const data = await res.json()
        setFolders(data.data ?? [])
      } catch {
        console.error("Failed to load folders")
      }
    }

    loadFolders()
  }, [])

  // One link per line, blank lines ignored, so pasting straight out of a
  // spreadsheet or a chat message works without tidying up first.
  const urls = urlsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const tooMany = urls.length > MAX_VIDEOS

  async function handleSubmit() {
    if (!folderId) {
      toast.error("Choose a folder first")
      return
    }

    if (urls.length === 0) {
      toast.error("Paste at least one YouTube link")
      return
    }

    if (tooMany) {
      toast.error(`That is ${urls.length} links. The limit is ${MAX_VIDEOS} at a time.`)
      return
    }

    setSaving(true)
    setResults(null)

    try {
      const res = await fetch("/api/admin/content/bulk-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder_id: folderId,
          videos: urls.map((url) => ({ youtube_url: url })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to add the recordings")
      }

      setResults(data.results as Outcome[])

      if (data.created > 0) {
        toast.success(
          `Added ${data.created} recording${data.created === 1 ? "" : "s"}`
        )
        // Leave any link that did not land, so it can be corrected and retried.
        setUrlsText(
          (data.results as Outcome[])
            .filter((r) => r.status === "failed")
            .map((r) => r.youtube_url)
            .join("\n")
        )
        onSuccess?.()
      } else {
        toast.error("Nothing was added. See the results below.")
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add the recordings"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Folder</label>

        <Select value={folderId} onValueChange={setFolderId}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                folders.length === 0
                  ? "No folders yet — create one in the single-video form"
                  : "Choose the folder these recordings belong to"
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
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium">YouTube links</label>

          <span
            className={
              tooMany
                ? "text-xs font-medium text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {urls.length} link{urls.length === 1 ? "" : "s"}
            {tooMany ? ` — limit is ${MAX_VIDEOS}` : ""}
          </span>
        </div>

        <Textarea
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          rows={8}
          placeholder={
            "One link per line:\nhttps://www.youtube.com/watch?v=...\nhttps://youtu.be/...\nhttps://www.youtube.com/live/..."
          }
          className="font-mono text-xs"
        />

        <p className="mt-1.5 text-xs text-muted-foreground">
          Titles are read from YouTube automatically. Links already in the
          library are skipped, so you can paste an overlapping list safely.
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={saving || urls.length === 0 || !folderId || tooMany}
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Adding {urls.length} recording{urls.length === 1 ? "" : "s"}...
          </>
        ) : (
          <>
            <Upload className="mr-2 size-4" />
            Add {urls.length > 0 ? urls.length : ""} recording
            {urls.length === 1 ? "" : "s"}
          </>
        )}
      </Button>

      {results && <ResultList results={results} />}
    </div>
  )
}

function ResultList({ results }: { results: Outcome[] }) {
  const icon = {
    created: <CheckCircle2 className="size-4 shrink-0 text-green-500" />,
    skipped: <SkipForward className="size-4 shrink-0 text-amber-500" />,
    failed: <XCircle className="size-4 shrink-0 text-destructive" />,
  }

  return (
    <div className="rounded-xl border border-border/70">
      <div className="border-b border-border/70 px-4 py-2.5 text-sm font-medium">
        Results
      </div>

      <ul className="divide-y divide-border/70">
        {results.map((result, i) => (
          <li key={`${result.youtube_url}-${i}`} className="flex gap-3 px-4 py-2.5">
            {icon[result.status]}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {result.title || result.youtube_url}
              </p>

              {result.reason && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {result.reason}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
