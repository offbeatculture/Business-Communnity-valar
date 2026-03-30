"use client"

import { useState } from "react"
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
} from "lucide-react"
import { toast } from "sonner"
import type { ContentItem, Category, ResourceDocument } from "@/types"

type Props = {
  items: ContentItem[]
  categories: Category[]
  onRefresh: () => void
}

export function AdminContentTable({ items, categories, onRefresh }: Props) {
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
        setEditKeyPoints(item.key_points ?? [])
        setEditActionItems(item.action_items ?? [])
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-muted-foreground font-medium">
                Type
              </th>
              <th className="text-left py-2 text-muted-foreground font-medium">
                Title
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
            {items.map((item) => {
              const type =
                item.content_type === "resource"
                  ? item.type
                  : "video_summary"
              const Icon = typeIcons[type]

              return (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-3">
                    <Icon className="size-4 text-muted-foreground" />
                  </td>
                  <td className="py-3 max-w-[200px] truncate font-medium">
                    {item.title}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>Update the content details below.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
