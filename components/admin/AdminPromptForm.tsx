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
import type { DailyPrompt } from "@/types"

const categories = [
  { value: "reflection", label: "Reflection" },
  { value: "challenge", label: "Challenge" },
  { value: "number", label: "By the Numbers" },
  { value: "advice", label: "Advice" },
  { value: "wins", label: "Wins" },
]

type Props = {
  editingPrompt?: DailyPrompt | null
  onDone?: () => void
}

export function AdminPromptForm({ editingPrompt, onDone }: Props) {
  const router = useRouter()
  const [promptText, setPromptText] = useState(editingPrompt?.prompt_text ?? "")
  const [category, setCategory] = useState<string>(editingPrompt?.category ?? "reflection")
  const [scheduledDate, setScheduledDate] = useState(editingPrompt?.scheduled_date ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!promptText.trim() || !scheduledDate || isSubmitting) return

    setIsSubmitting(true)
    try {
      const url = editingPrompt
        ? `/api/admin/prompts/${editingPrompt.id}`
        : "/api/admin/prompts"

      const res = await fetch(url, {
        method: editingPrompt ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_text: promptText.trim(),
          category,
          scheduled_date: scheduledDate,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed")
      }

      toast.success(editingPrompt ? "Prompt updated" : "Prompt created")
      setPromptText("")
      setScheduledDate("")
      setCategory("reflection")
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
        <label className="text-sm font-medium mb-1 block">Prompt Question</label>
        <Textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="What's one business lesson you learned this week?"
          maxLength={500}
          rows={2}
          className="resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Scheduled Date</label>
          <Input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" disabled={!promptText.trim() || !scheduledDate || isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin mr-1.5" />
        ) : (
          <Plus className="size-4 mr-1.5" />
        )}
        {editingPrompt ? "Update Prompt" : "Create Prompt"}
      </Button>
    </form>
  )
}
