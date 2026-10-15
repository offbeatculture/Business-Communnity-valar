"use client"

import { useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  CornerDownRight,
  Folder,
  FolderInput,
  ImageIcon,
  Loader2,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { FolderPicker } from "@/components/admin/FolderPicker"
import {
  descendantIds,
  flattenTree,
  folderPathLabel,
  moveFoldersError,
} from "@/lib/folder-tree"

export type ContentFolder = {
  id: string
  name: string
  slug: string
  description: string | null
  cover_image_url: string | null
  sort_order: number
  /** The folder this one sits inside. Null = top level of the library. */
  parent_id: string | null
  created_at: string
}

/** Deeper than this and the cards get too narrow to edit comfortably. */
const MAX_INDENT_LEVELS = 3

/**
 * Lists every content folder in tree order — subfolders indented under their
 * parent — and lets an admin rename one, edit its description, set its cover,
 * or select several and move them inside another folder.
 *
 * The folder list belongs to the page so the video table's "Move to folder"
 * picker sees the same folders. Every change here calls `onChange` to reload.
 */
export function FolderManager({
  folders,
  onChange,
}: {
  folders: ContentFolder[]
  onChange: () => void | Promise<void>
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [target, setTarget] = useState<string | null | undefined>(undefined)
  const [moving, setMoving] = useState(false)

  const rows = useMemo(() => flattenTree(folders), [folders])

  // Drop selections for folders that no longer exist (deleted elsewhere).
  const liveSelected = useMemo(
    () => new Set([...selected].filter((id) => folders.some((f) => f.id === id))),
    [selected, folders]
  )

  // A folder cannot go inside itself or anything below it.
  const blockedTargets = useMemo(() => {
    const blocked = new Set<string>()
    for (const id of liveSelected) {
      blocked.add(id)
      for (const d of descendantIds(folders, id)) blocked.add(d)
    }
    return blocked
  }, [liveSelected, folders])

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
    setTarget(undefined)
  }

  async function handleMove() {
    if (liveSelected.size === 0 || target === undefined) return

    const ids = [...liveSelected]
    const problem = moveFoldersError(folders, ids, target)
    if (problem) {
      toast.error(problem)
      return
    }

    setMoving(true)

    try {
      const res = await fetch("/api/admin/content-folders/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_ids: ids, parent_id: target }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to move folders")

      const where =
        target === null ? "the top level" : `"${folderPathLabel(folders, target)}"`
      toast.success(
        `Moved ${ids.length} folder${ids.length === 1 ? "" : "s"} to ${where}`
      )
      clearSelection()
      await onChange()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move folders")
    } finally {
      setMoving(false)
    }
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
      {liveSelected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-card p-3 shadow-md">
          <span className="text-sm font-medium">
            {liveSelected.size} folder{liveSelected.size === 1 ? "" : "s"} selected
          </span>

          <span className="text-sm text-muted-foreground">Move into</span>

          <FolderPicker
            folders={folders}
            value={target}
            onChange={setTarget}
            allowTopLevel
            disabledIds={blockedTargets}
            placeholder="Choose a parent folder"
            className="w-full sm:w-64"
          />

          <Button
            size="sm"
            onClick={handleMove}
            disabled={moving || target === undefined}
          >
            {moving ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <FolderInput className="mr-1.5 size-3.5" />
            )}
            Move
          </Button>

          <Button size="sm" variant="ghost" onClick={clearSelection}>
            <X className="mr-1 size-3.5" />
            Clear
          </Button>
        </div>
      )}

      {rows.map(({ folder, depth }) => (
        <div
          key={folder.id}
          // Indent subfolders under their parent. Inline because the step is
          // computed; capped so deep trees stay editable on narrow screens.
          style={{ marginLeft: Math.min(depth, MAX_INDENT_LEVELS) * 20 }}
        >
          <FolderRow
            folder={folder}
            parentLabel={
              folder.parent_id ? folderPathLabel(folders, folder.parent_id) : null
            }
            selected={liveSelected.has(folder.id)}
            onToggle={() => toggle(folder.id)}
            onChanged={onChange}
          />
        </div>
      ))}
    </div>
  )
}

function FolderRow({
  folder,
  parentLabel,
  selected,
  onToggle,
  onChanged,
}: {
  folder: ContentFolder
  parentLabel: string | null
  selected: boolean
  onToggle: () => void
  onChanged: () => void | Promise<void>
}) {
  const [name, setName] = useState(folder.name)
  const [description, setDescription] = useState(folder.description ?? "")
  const [coverUrl, setCoverUrl] = useState(folder.cover_image_url ?? "")
  const [sortOrder, setSortOrder] = useState(String(folder.sort_order))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fileInput = useRef<HTMLInputElement>(null)

  const dirty =
    name !== folder.name ||
    description !== (folder.description ?? "") ||
    coverUrl !== (folder.cover_image_url ?? "") ||
    sortOrder !== String(folder.sort_order)

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
          // A blank or non-numeric box means "leave it unordered".
          sort_order: Number.isFinite(Number(sortOrder)) && sortOrder.trim()
            ? Math.trunc(Number(sortOrder))
            : 0,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to save")

      const updated = data.data as ContentFolder
      setSortOrder(String(updated.sort_order))
      await onChanged()
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
      await onChanged()
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

      await onChanged()
      toast.success("Folder deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border/70"
      }`}
    >
      <label className="mb-3 flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="size-4 cursor-pointer accent-primary"
        />
        <span className="font-medium">Select to move</span>

        {parentLabel && (
          <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <CornerDownRight className="size-3.5 shrink-0" />
            <span className="truncate">Inside {parentLabel}</span>
          </span>
        )}
      </label>

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
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="w-24 shrink-0">
              <label className="mb-1 block text-xs font-medium">Order</label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                title="Lower sorts first. Use a negative number to pin this folder to the top."
              />
            </div>
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
