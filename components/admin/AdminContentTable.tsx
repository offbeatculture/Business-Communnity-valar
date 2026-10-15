"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Video,
  FileSpreadsheet,
  Loader2,
  Plus,
  X,
  FileIcon,
  FolderInput,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { CoverImageField } from "@/components/admin/CoverImageField"
import { FolderPicker } from "@/components/admin/FolderPicker"
import type { ContentFolder } from "@/components/admin/FolderManager"
import { flattenTree, folderPathLabel } from "@/lib/folder-tree"
import {
  VideoResourceField,
  type PendingResource,
  type SavedResource,
} from "@/components/admin/VideoResourceField"
import type { ContentItem, Category, ResourceDocument } from "@/types"

type Props = {
  items: ContentItem[]
  categories: Category[]
  folders: ContentFolder[]
  onRefresh: () => void | Promise<void>
}

// Folder filter values. Radix Select reserves "", so these stand in.
const ALL_FOLDERS = "__all__"
const NO_FOLDER = "__none__"

function folderIdOf(item: ContentItem): string | null {
  return item.content_type === "video_summary" ? item.folder_id : null
}

export function AdminContentTable({ items, categories, folders, onRefresh }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [moveTarget, setMoveTarget] = useState<string | null | undefined>(undefined)
  const [moving, setMoving] = useState(false)
  const [folderFilter, setFolderFilter] = useState(ALL_FOLDERS)

  const visibleItems = useMemo(() => {
    if (folderFilter === ALL_FOLDERS) return items
    if (folderFilter === NO_FOLDER) return items.filter((item) => !folderIdOf(item))
    return items.filter((item) => folderIdOf(item) === folderFilter)
  }, [items, folderFilter])

  // Only count what is on screen and still exists after a refresh.
  const visibleSelected = visibleItems.filter((item) => selected.has(item.id))
  const allVisibleSelected =
    visibleItems.length > 0 && visibleSelected.length === visibleItems.length

  const unfiledCount = items.filter((item) => !folderIdOf(item)).length

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current)
      if (allVisibleSelected) visibleItems.forEach((item) => next.delete(item.id))
      else visibleItems.forEach((item) => next.add(item.id))
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
    setMoveTarget(undefined)
  }

  async function handleMove() {
    const ids = visibleSelected.map((item) => item.id)
    if (ids.length === 0 || !moveTarget) return

    setMoving(true)

    try {
      const res = await fetch("/api/admin/content/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_ids: ids, folder_id: moveTarget }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to move recordings")

      toast.success(
        `Moved ${data.moved} recording${data.moved === 1 ? "" : "s"} to "${folderPathLabel(
          folders,
          moveTarget
        )}"`
      )
      clearSelection()
      await onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move recordings")
    } finally {
      setMoving(false)
    }
  }

  const [editItem, setEditItem] = useState<ContentItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<ContentItem | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editPublished, setEditPublished] = useState(true)
  const [existingDocs, setExistingDocs] = useState<ResourceDocument[]>([])
  const [docsToRemove, setDocsToRemove] = useState<string[]>([])
  const [newDocs, setNewDocs] = useState<{ label: string; file: File | null }[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Video summary edit fields
  const [editYoutubeUrl, setEditYoutubeUrl] = useState("")
  const [editTakeaway, setEditTakeaway] = useState("")
  const [editThumbnailUrl, setEditThumbnailUrl] = useState("")
  const [savedResources, setSavedResources] = useState<SavedResource[]>([])
  const [newResources, setNewResources] = useState<PendingResource[]>([])
  const [resourcesToRemove, setResourcesToRemove] = useState<string[]>([])
  const [editKeyPoints, setEditKeyPoints] = useState<{ point: string; timestamp?: string }[]>([])
  const [editActionItems, setEditActionItems] = useState<string[]>([])

  async function openEdit(item: ContentItem) {
    setEditItem(item)
    setEditTitle(item.title)
    setEditDescription(
      item.content_type === "resource"
        ? item.description ?? ""
        : item.full_summary ?? ""
    )
    setEditCategory(item.category)
    setEditPublished(item.is_published)
    setDocsToRemove([])
    setSavedResources([])
    setNewResources([])
    setResourcesToRemove([])
    setNewDocs([])

    // Fetch existing documents for resources
    if (item.content_type === "resource") {
      setLoadingDocs(true)
      try {
        const res = await fetch(`/api/admin/content/${item.id}/documents`)
        if (res.ok) {
          const data = await res.json()
          setExistingDocs(data)
        } else {
          setExistingDocs([])
        }
      } catch {
        setExistingDocs([])
      } finally {
        setLoadingDocs(false)
      }
    } else {
      setExistingDocs([])
      // Populate video summary fields
      if (item.content_type === "video_summary") {
        setEditYoutubeUrl(item.youtube_url ?? "")
        setEditTakeaway(item.one_line_takeaway ?? "")
        setEditThumbnailUrl(item.thumbnail_url ?? "")
        setEditKeyPoints(item.key_points ?? [])
        setEditActionItems(item.action_items ?? [])

        try {
          const res = await fetch(`/api/admin/content/${item.id}/resources`)
          const data = res.ok ? await res.json() : { data: [] }
          setSavedResources(data.data ?? [])
        } catch {
          setSavedResources([])
        }
      }
    }
  }

  async function handleEdit() {
    if (!editItem) return

    setSaving(true)

    try {
      const body: Record<string, unknown> = {
        title: editTitle,
        category: editCategory,
        is_published: editPublished,
      }

      if (editItem.content_type === "resource") {
        body.description = editDescription || null

        // Handle document removals
        if (docsToRemove.length > 0) {
          body.remove_documents = docsToRemove
        }

        // Upload and attach new documents
        const validNewDocs = newDocs.filter((d) => d.label && d.file)
        if (validNewDocs.length > 0) {
          const uploadedDocs: { label: string; file_url: string; sort_order: number }[] = []
          const maxOrder = existingDocs.reduce((max, d) => Math.max(max, d.sort_order), -1)

          for (let i = 0; i < validNewDocs.length; i++) {
            const doc = validNewDocs[i]
            const formData = new FormData()
            formData.append("file", doc.file!)

            const uploadRes = await fetch("/api/admin/content/upload", {
              method: "POST",
              body: formData,
            })

            if (!uploadRes.ok) {
              const err = await uploadRes.json()
              throw new Error(err.error || `Upload failed for ${doc.label}`)
            }

            const { path } = await uploadRes.json()
            uploadedDocs.push({
              label: doc.label,
              file_url: path,
              sort_order: maxOrder + 1 + i,
            })
          }

          body.documents = uploadedDocs
        }
      } else {
        body.full_summary = editDescription || null
        body.youtube_url = editYoutubeUrl || undefined
        body.one_line_takeaway = editTakeaway || null
        body.thumbnail_url = editThumbnailUrl.trim() || null

        if (resourcesToRemove.length > 0) {
          body.remove_resources = resourcesToRemove
        }

        if (newResources.length > 0) {
          body.resources = newResources.map((resource) => ({
            label: resource.label.trim() || resource.fileName,
            file_url: resource.file_url,
          }))
        }
        body.key_points = editKeyPoints.length > 0 ? editKeyPoints : null
        body.action_items = editActionItems.length > 0 ? editActionItems : null
      }

      const res = await fetch(`/api/admin/content/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update")
      }

      toast.success("Content updated")
      setEditItem(null)
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteItem) return

    setDeleting(true)

    try {
      const res = await fetch(`/api/admin/content/${deleteItem.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete")
      }

      toast.success("Content deleted")
      setDeleteItem(null)
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed")
    } finally {
      setDeleting(false)
    }
  }

  const typeIcons = {
    cheat_sheet: FileText,
    template: FileSpreadsheet,
    video_summary: Video,
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No content yet. Use the forms above to create some.
      </p>
    )
  }

  return (
    <>
      {/* Filter + bulk move */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select value={folderFilter} onValueChange={setFolderFilter}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value={ALL_FOLDERS}>All folders ({items.length})</SelectItem>
              {unfiledCount > 0 && (
                <SelectItem value={NO_FOLDER}>
                  Not in any folder ({unfiledCount})
                </SelectItem>
              )}
              {flattenTree(folders).map(({ folder, depth }) => (
                <SelectItem
                  key={folder.id}
                  value={folder.id}
                  style={{ paddingLeft: 8 + depth * 16 }}
                >
                  {depth > 0 && (
                    <span aria-hidden className="text-muted-foreground">
                      ↳
                    </span>
                  )}
                  {folder.name} (
                  {items.filter((item) => folderIdOf(item) === folder.id).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {visibleSelected.length > 0 && (
          <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-card p-3 shadow-md">
            <span className="text-sm font-medium">
              {visibleSelected.length} recording
              {visibleSelected.length === 1 ? "" : "s"} selected
            </span>

            <span className="text-sm text-muted-foreground">Move to</span>

            <FolderPicker
              folders={folders}
              value={moveTarget}
              onChange={setMoveTarget}
              placeholder="Choose a folder"
              className="w-full sm:w-64"
            />

            <Button
              size="sm"
              onClick={handleMove}
              disabled={moving || !moveTarget}
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="w-8 py-2 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all recordings shown"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  className="size-4 cursor-pointer accent-primary"
                />
              </th>
              <th className="text-left py-2 text-muted-foreground font-medium">
                Type
              </th>
              <th className="text-left py-2 text-muted-foreground font-medium">
                Title
              </th>
              <th className="text-left py-2 text-muted-foreground font-medium hidden md:table-cell">
                Folder
              </th>
              <th className="text-left py-2 text-muted-foreground font-medium hidden sm:table-cell">
                Category
              </th>
              <th className="text-center py-2 text-muted-foreground font-medium hidden sm:table-cell">
                Views
              </th>
              <th className="text-center py-2 text-muted-foreground font-medium">
                Status
              </th>
              <th className="text-right py-2 text-muted-foreground font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  No recordings in this folder.
                </td>
              </tr>
            )}

            {visibleItems.map((item) => {
              const type =
                item.content_type === "resource"
                  ? item.type
                  : "video_summary"
              const Icon = typeIcons[type]
              const folderId = folderIdOf(item)
              const isSelected = selected.has(item.id)

              return (
                <tr
                  key={item.id}
                  className={`border-b last:border-0 ${isSelected ? "bg-primary/5" : ""}`}
                >
                  <td className="py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.title}`}
                      checked={isSelected}
                      onChange={() => toggleOne(item.id)}
                      className="size-4 cursor-pointer accent-primary"
                    />
                  </td>
                  <td className="py-3">
                    <Icon className="size-4 text-muted-foreground" />
                  </td>
                  <td className="py-3 max-w-[200px] truncate font-medium">
                    {item.title}
                  </td>
                  <td className="py-3 hidden max-w-[220px] md:table-cell">
                    {folderId && folders.some((f) => f.id === folderId) ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {folderPathLabel(folders, folderId)}
                      </span>
                    ) : (
                      // Members only reach recordings through a folder, so
                      // one with none is invisible to them.
                      <span
                        className="inline-flex items-center gap-1 text-xs text-amber-600"
                        title="Members can't see recordings that aren't in a folder"
                      >
                        <AlertTriangle className="size-3.5" />
                        No folder
                      </span>
                    )}
                  </td>
                  <td className="py-3 hidden sm:table-cell">
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                  </td>
                  <td className="py-3 text-center tabular-nums hidden sm:table-cell">
                    {item.view_count}
                  </td>
                  <td className="py-3 text-center">
                    {item.is_published ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-500/10 text-green-500"
                      >
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleteItem(item)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        {/* The default dialog is a narrow, fixed-height box, so this form ran
            off the bottom with no way to reach the rest. Wider, capped to the
            viewport, with the fields scrolling between a pinned header and
            footer. */}
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>Update the content details below.</DialogDescription>
          </DialogHeader>

          <div className="-mr-2 flex-1 space-y-4 overflow-y-auto pr-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Category
              </label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
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
                {editItem?.content_type === "resource"
                  ? "Description"
                  : "Full Summary"}
              </label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Video summary extra fields */}
            {editItem?.content_type === "video_summary" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    YouTube URL
                  </label>
                  <Input
                    value={editYoutubeUrl}
                    onChange={(e) => setEditYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>

                <CoverImageField
                  value={editThumbnailUrl}
                  onChange={setEditThumbnailUrl}
                  kind="video"
                  fallbackUrl={
                    editItem.youtube_video_id
                      ? `https://img.youtube.com/vi/${editItem.youtube_video_id}/hqdefault.jpg`
                      : null
                  }
                />

                <VideoResourceField
                  saved={savedResources}
                  removedIds={resourcesToRemove}
                  onToggleRemove={(id) =>
                    setResourcesToRemove((current) =>
                      current.includes(id)
                        ? current.filter((item) => item !== id)
                        : [...current, id]
                    )
                  }
                  pending={newResources}
                  onPendingChange={setNewResources}
                />

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    One-Line Takeaway
                  </label>
                  <Input
                    value={editTakeaway}
                    onChange={(e) => setEditTakeaway(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Key Points ({editKeyPoints.length})
                  </label>
                  <div className="space-y-2">
                    {editKeyPoints.map((kp, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={kp.point}
                          onChange={(e) =>
                            setEditKeyPoints((prev) =>
                              prev.map((p, idx) =>
                                idx === i ? { ...p, point: e.target.value } : p
                              )
                            )
                          }
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            setEditKeyPoints((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
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
                        setEditKeyPoints((prev) => [...prev, { point: "" }])
                      }
                    >
                      <Plus className="size-4 mr-1" />
                      Add key point
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Action Items ({editActionItems.length})
                  </label>
                  <div className="space-y-2">
                    {editActionItems.map((item, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={item}
                          onChange={(e) =>
                            setEditActionItems((prev) =>
                              prev.map((a, idx) =>
                                idx === i ? e.target.value : a
                              )
                            )
                          }
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            setEditActionItems((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
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
                        setEditActionItems((prev) => [...prev, ""])
                      }
                    >
                      <Plus className="size-4 mr-1" />
                      Add action item
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Documents section for resources */}
            {editItem?.content_type === "resource" && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Documents
                </label>

                {loadingDocs ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="size-4 animate-spin" />
                    Loading documents...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Existing documents */}
                    {existingDocs
                      .filter((d) => !docsToRemove.includes(d.id))
                      .map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-2 rounded-lg border p-2 text-sm"
                        >
                          <FileIcon className="size-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate">{doc.label}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() =>
                              setDocsToRemove((prev) => [...prev, doc.id])
                            }
                          >
                            <X className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}

                    {existingDocs.length === 0 &&
                      newDocs.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No documents attached yet.
                        </p>
                      )}

                    {/* New documents to add */}
                    {newDocs.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 rounded-lg border border-dashed p-2"
                      >
                        <div className="flex-1 space-y-1.5">
                          <Input
                            placeholder="Label (e.g. Implementation Guide)"
                            value={doc.label}
                            onChange={(e) =>
                              setNewDocs((prev) =>
                                prev.map((d, i) =>
                                  i === index
                                    ? { ...d, label: e.target.value }
                                    : d
                                )
                              )
                            }
                          />
                          <Input
                            type="file"
                            accept="application/pdf,text/html,.html"
                            onChange={(e) =>
                              setNewDocs((prev) =>
                                prev.map((d, i) =>
                                  i === index
                                    ? {
                                        ...d,
                                        file: e.target.files?.[0] ?? null,
                                      }
                                    : d
                                )
                              )
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="shrink-0 mt-1"
                          onClick={() =>
                            setNewDocs((prev) =>
                              prev.filter((_, i) => i !== index)
                            )
                          }
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNewDocs((prev) => [
                          ...prev,
                          { label: "", file: null },
                        ])
                      }
                    >
                      <Plus className="size-4 mr-1" />
                      Add document
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditPublished(!editPublished)}
              >
                {editPublished ? (
                  <Eye className="size-3.5 mr-1" />
                ) : (
                  <EyeOff className="size-3.5 mr-1" />
                )}
                {editPublished ? "Published" : "Draft"}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteItem?.title}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
