"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react"
import type { PromptLibraryItem } from "@/types"
import { PromptLibraryForm } from "./PromptLibraryForm"

type Props = {
  prompts: PromptLibraryItem[]
}

export function PromptLibraryTable({ prompts }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm("Delete this prompt?")) return

    try {
      const res = await fetch(`/api/admin/prompts-library/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Prompt deleted")
      router.refresh()
    } catch {
      toast.error("Failed to delete prompt")
    }
  }

  async function togglePublished(prompt: PromptLibraryItem) {
    try {
      const res = await fetch(`/api/admin/prompts-library/${prompt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !prompt.is_published }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast.success(prompt.is_published ? "Unpublished" : "Published")
      router.refresh()
    } catch {
      toast.error("Failed to update prompt")
    }
  }

  if (prompts.length === 0) {
    return <p className="text-sm text-muted-foreground">No prompts yet. Create one above.</p>
  }

  return (
    <div className="space-y-3">
      {prompts.map((prompt) => (
        <div key={prompt.id}>
          {editingId === prompt.id ? (
            <div className="border rounded-lg p-4 bg-muted/30">
              <PromptLibraryForm
                editingPrompt={prompt}
                onDone={() => setEditingId(null)}
              />
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3 border rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{prompt.title}</p>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {prompt.category}
                  </Badge>
                  {!prompt.is_published && (
                    <Badge variant="secondary" className="text-xs shrink-0">Draft</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{prompt.prompt_text}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {prompt.copy_count} copies
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="size-8" onClick={() => togglePublished(prompt)}>
                  {prompt.is_published ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditingId(prompt.id)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => handleDelete(prompt.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
