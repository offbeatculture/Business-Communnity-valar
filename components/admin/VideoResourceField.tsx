"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Loader2, Paperclip, Trash2, Upload, X } from "lucide-react"
import { toast } from "sonner"

/** A resource already saved against the recording. */
export type SavedResource = {
  id: string
  label: string
  file_url: string
  sort_order: number
}

/** A resource picked in the form but not yet saved. */
export type PendingResource = {
  /** Local key, not a database id. */
  key: string
  label: string
  /** Storage path returned by the upload endpoint. */
  file_url: string
  fileName: string
}

type Props = {
  /** Existing rows. Omit when adding a brand new recording. */
  saved?: SavedResource[]
  /** Ids of saved rows the admin has marked for removal. */
  removedIds?: string[]
  onToggleRemove?: (id: string) => void
  pending: PendingResource[]
  onPendingChange: (pending: PendingResource[]) => void
  label?: string
}

/**
 * Attach downloadable files to a recording.
 *
 * Each file uploads as soon as it is chosen, so the form holds a storage path
 * rather than a File object. That keeps saving fast and means a large handout
 * is not re-sent if the admin fixes a typo elsewhere and saves again.
 */
export function VideoResourceField({
  saved = [],
  removedIds = [],
  onToggleRemove,
  pending,
  onPendingChange,
  label = "Resources",
}: Props) {
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    setUploading(true)

    try {
      const added: PendingResource[] = []

      // Sequential rather than parallel: these are large files on what is often
      // a home connection, and a clear one-at-a-time failure beats a pile-up.
      for (const file of Array.from(files)) {
        const body = new FormData()
        body.append("file", file)

        const res = await fetch("/api/admin/resources/upload", {
          method: "POST",
          body,
        })

        const data = await res.json()

        if (!res.ok) {
          toast.error(`${file.name}: ${data.error ?? "upload failed"}`)
          continue
        }

        added.push({
          key: `${Date.now()}-${file.name}`,
          // Default the label to the filename without its extension, which is
          // usually what the admin would have typed anyway.
          label: file.name.replace(/\.[^.]+$/, ""),
          file_url: data.path as string,
          fileName: file.name,
        })
      }

      if (added.length > 0) {
        onPendingChange([...pending, ...added])
        toast.success(
          `Attached ${added.length} file${added.length === 1 ? "" : "s"}. Save to apply.`
        )
      }
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  function updateLabel(key: string, value: string) {
    onPendingChange(
      pending.map((item) => (item.key === key ? { ...item, label: value } : item))
    )
  }

  function removePending(key: string) {
    onPendingChange(pending.filter((item) => item.key !== key))
  }

  const hasAny = saved.length > 0 || pending.length > 0

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>

      <div className="space-y-2">
        {saved.map((resource) => {
          const removed = removedIds.includes(resource.id)

          return (
            <div
              key={resource.id}
              className={`flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 ${
                removed ? "opacity-50" : ""
              }`}
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />

              <span
                className={`min-w-0 flex-1 truncate text-sm ${
                  removed ? "line-through" : ""
                }`}
              >
                {resource.label}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onToggleRemove?.(resource.id)}
                title={removed ? "Keep this resource" : "Remove this resource"}
              >
                {removed ? (
                  <X className="size-3.5" />
                ) : (
                  <Trash2 className="size-3.5 text-destructive" />
                )}
              </Button>
            </div>
          )
        })}

        {pending.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2"
          >
            <Paperclip className="size-4 shrink-0 text-muted-foreground" />

            <Input
              value={item.label}
              onChange={(e) => updateLabel(item.key, e.target.value)}
              placeholder="What members will see"
              className="h-8 flex-1"
            />

            <span
              className="hidden max-w-[10rem] truncate text-xs text-muted-foreground sm:block"
              title={item.fileName}
            >
              {item.fileName}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removePending(item.key)}
              title="Discard this file"
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        ))}

        {!hasAny && (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            No resources attached. Add a worksheet, guide or slides members can
            download with this session.
          </p>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files)
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
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
            Add resource
          </>
        )}
      </Button>

      <p className="mt-1.5 text-xs text-muted-foreground">
        PDF, Word, Excel, PowerPoint, images, text or ZIP, up to 25MB each.
      </p>
    </div>
  )
}
