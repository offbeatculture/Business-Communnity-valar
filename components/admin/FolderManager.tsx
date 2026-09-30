"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Folder, ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

type ContentFolder = {
  id: string
  name: string
  slug: string
  description: string | null
  cover_image_url: string | null
  created_at: string
}

/**
 * Lists every content folder and lets an admin rename it, edit its description,
 * and set or clear a cover image — either by uploading a file or pasting a URL.
 */
export function FolderManager({ onChange }: { onChange?: () => void }) {
  const [folders, setFolders] = useState<ContentFolder[]>([])
  const [loading, setLoading] = useState(true)

  async function loadFolders() {
    try {
      const res = await fetch("/api/admin/content-folders")
      if (!res.ok) throw new Error()

      const data = await res.json()
      setFolders(data.data ?? [])
    } catch {
      toast.error("Failed to load folders")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFolders()
  }, [])

  function replaceFolder(updated: ContentFolder) {
    setFolders((current) =>
      current.map((folder) => (folder.id === updated.id ? updated : folder))
    )
    onChange?.()
  }

  function removeFolder(id: string) {
    setFolders((current) => current.filter((folder) => folder.id !== id))
    onChange?.()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (folders.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No folders yet. Create one from the single-video form above.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {folders.map((folder) => (
        <FolderRow
          key={folder.id}
          folder={folder}
          onUpdated={replaceFolder}
          onDeleted={removeFolder}
        />
      ))}
    </div>
  )
}

function FolderRow({
  folder,
  onUpdated,
  onDeleted,
}: {
  folder: ContentFolder
  onUpdated: (folder: ContentFolder) => void
  onDeleted: (id: string) => void
}) {
  const [name, setName] = useState(folder.name)
  const [description, setDescription] = useState(folder.description ?? "")
  const [coverUrl, setCoverUrl] = useState(folder.cover_image_url ?? "")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fileInput = useRef<HTMLInputElement>(null)

  const dirty =
    name !== folder.name ||
    description !== (folder.description ?? "") ||
    coverUrl !== (folder.cover_image_url ?? "")

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Folder name cannot be empty")
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`/api/admin/content-folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to save")

      onUpdated(data.data as ContentFolder)
      toast.success("Folder updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)

    try {
      const body = new FormData()
      body.append("file", file)

      const res = await fetch(
        `/api/admin/content-folders/${folder.id}/cover`,
        { method: "POST", body }
      )

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to upload")

      const updated = data.data as ContentFolder
      setCoverUrl(updated.cover_image_url ?? "")
      onUpdated(updated)
      toast.success("Cover image updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload")
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete the folder "${folder.name}"? This cannot be undone.`
    )

    if (!confirmed) return

    setDeleting(true)

    try {
      const res = await fetch(`/api/admin/content-folders/${folder.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to delete")

      onDeleted(folder.id)
      toast.success("Folder deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border/70 p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Cover preview */}
        <div className="w-full shrink-0 sm:w-48">
          <div className="relative aspect-video overflow-hidden rounded-lg border border-border/70 bg-muted">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Folder className="size-8 text-muted-foreground" />
              </div>
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
                  {coverUrl ? "Replace" : "Upload"}
                </>
              )}
            </Button>

            {coverUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCoverUrl("")}
                title="Clear the cover image"
              >
                <ImageIcon className="size-3.5" />
              </Button>
            )}
          </div>

          <p className="mt-1.5 text-[11px] text-muted-foreground">
            JPEG, PNG or WebP, up to 4MB. 16:9 looks best.
          </p>
        </div>

        {/* Fields */}
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional — shown under the folder name."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">
              Cover image URL
            </label>
            <Input
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="Or paste an image URL instead of uploading"
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Save className="mr-1.5 size-3.5" />
                  Save
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
