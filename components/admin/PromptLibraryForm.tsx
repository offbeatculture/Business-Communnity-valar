"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
import { Loader2, Plus } from "lucide-react"
import { PROMPT_CATEGORIES } from "@/lib/prompt-categories"
import type { PromptLibraryItem } from "@/types"

type Props = {
  editingPrompt?: PromptLibraryItem | null
  onDone?: () => void
}

export function PromptLibraryForm({ editingPrompt, onDone }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(editingPrompt?.title ?? "")
  const [promptText, setPromptText] = useState(editingPrompt?.prompt_text ?? "")
  const [category, setCategory] = useState(editingPrompt?.category ?? "marketing")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !promptText.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const url = editingPrompt
        ? `/api/admin/prompts-library/${editingPrompt.id}`
        : "/api/admin/prompts-library"

      const res = await fetch(url, {
        method: editingPrompt ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          prompt_text: promptText.trim(),
          category,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed")
      }

      toast.success(editingPrompt ? "Prompt updated" : "Prompt created")
      setTitle("")
      setPromptText("")
      setCategory("marketing")
      router.refresh()
      onDone?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save prompt")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Content Calendar Generator"
          maxLength={200}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Prompt Text</label>
        <Textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="The full prompt that users will copy..."
          maxLength={5000}
          rows={6}
          className="resize-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROMPT_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={!title.trim() || !promptText.trim() || isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin mr-1.5" />
        ) : (
          <Plus className="size-4 mr-1.5" />
        )}
        {editingPrompt ? "Update Prompt" : "Add Prompt"}
      </Button>
    </form>
  )
}
