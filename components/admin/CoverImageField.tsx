"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageOff, Loader2, Upload, Video } from "lucide-react"
import { toast } from "sonner"

type Props = {
  /** Current cover URL, or "" for none. */
  value: string
  onChange: (url: string) => void
  /** Which bucket the upload goes to. */
  kind?: "video" | "folder"
  label?: string
  /** Shown in the preview box when there is no cover yet. */
  fallbackUrl?: string | null
  fallbackNote?: string
}

/**
 * Cover image picker: upload a file or paste a URL.
 *
 * Uploading only puts the file in storage and hands back a URL — it does not
 * save anything. The surrounding form persists the value when it saves, so a
 * half-filled form never writes a cover onto a live recording.
 */
export function CoverImageField({
  value,
  onChange,
  kind = "video",
  label = "Cover image",
  fallbackUrl,
  fallbackNote = "Using the YouTube thumbnail. Upload an image to replace it.",
}: Props) {
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const preview = value || fallbackUrl || null
  const usingFallback = !value && Boolean(fallbackUrl)

  async function handleUpload(file: File) {
    setUploading(true)

    try {
      const body = new FormData()
      body.append("file", file)
      body.append("kind", kind)

      const res = await fetch("/api/admin/covers", { method: "POST", body })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to upload")

      onChange(data.url as string)
      toast.success("Cover uploaded. Save to apply it.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload")
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="w-full shrink-0 sm:w-44">
          <div className="relative aspect-video overflow-hidden rounded-lg border border-border/70 bg-muted">
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Video className="size-7 text-muted-foreground" />
              </div>
            )}

            {usingFallback && (
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                YouTube default
              </span>
            )}
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
            }}
          />

          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Uploading
                </>
              ) : (
                <>
                  <Upload className="mr-1.5 size-3.5" />
                  {value ? "Replace" : "Upload"}
                </>
              )}
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="Remove the custom cover"
                onClick={() => onChange("")}
              >
                <ImageOff className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste an image URL"
            className="font-mono text-xs"
          />

          <p className="mt-1.5 text-xs text-muted-foreground">
            JPEG, PNG or WebP, up to 4MB. 16:9 looks best.
            {usingFallback ? ` ${fallbackNote}` : ""}
          </p>
        </div>
      </div>
    </div>
  )
}
