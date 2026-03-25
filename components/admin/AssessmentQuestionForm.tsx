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
import { Loader2, Plus, Trash2 } from "lucide-react"
import { ASSESSMENT_CATEGORIES, CATEGORY_LABELS } from "@/lib/assessment-categories"
import type { AssessmentQuestion } from "@/types"

type Option = { label: string; value: string; score: number }

type Props = {
  assessmentId: string
  editingQuestion?: AssessmentQuestion | null
  onDone?: () => void
}

export function AssessmentQuestionForm({ assessmentId, editingQuestion, onDone }: Props) {
  const router = useRouter()
  const [questionText, setQuestionText] = useState(editingQuestion?.question_text ?? "")
  const [category, setCategory] = useState(editingQuestion?.category ?? "offer")
  const [sortOrder, setSortOrder] = useState(editingQuestion?.sort_order ?? 0)
  const [options, setOptions] = useState<Option[]>(
    editingQuestion?.options ?? [
      { label: "", value: "a", score: 1 },
      { label: "", value: "b", score: 2 },
      { label: "", value: "c", score: 3 },
      { label: "", value: "d", score: 4 },
    ],
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateOption(index: number, field: keyof Option, value: string | number) {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt)),
    )
  }

  function addOption() {
    const nextLetter = String.fromCharCode(97 + options.length)
    setOptions((prev) => [...prev, { label: "", value: nextLetter, score: prev.length + 1 }])
  }

  function removeOption(index: number) {
    if (options.length <= 2) return
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!questionText.trim() || options.some((o) => !o.label.trim()) || isSubmitting) return

    setIsSubmitting(true)
    try {
      const url = editingQuestion
        ? `/api/admin/assessment/${assessmentId}/questions/${editingQuestion.id}`
        : `/api/admin/assessment/${assessmentId}/questions`

      const res = await fetch(url, {
        method: editingQuestion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_text: questionText.trim(),
          category,
          sort_order: sortOrder,
          options: options.map((o) => ({ label: o.label.trim(), value: o.value, score: o.score })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed")
      }

      toast.success(editingQuestion ? "Question updated" : "Question created")
      setQuestionText("")
      setOptions([
        { label: "", value: "a", score: 1 },
        { label: "", value: "b", score: 2 },
        { label: "", value: "c", score: 3 },
        { label: "", value: "d", score: 4 },
      ])
      setSortOrder(0)
      router.refresh()
      onDone?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save question")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Question</label>
        <Textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="How would you rate your current marketing efforts?"
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
              {ASSESSMENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Sort Order</label>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            min={0}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Options (score 1-5)</label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={opt.label}
                onChange={(e) => updateOption(i, "label", e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1"
              />
              <Input
                type="number"
                value={opt.score}
                onChange={(e) => updateOption(i, "score", Number(e.target.value))}
                min={1}
                max={5}
                className="w-16"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive"
                onClick={() => removeOption(i)}
                disabled={options.length <= 2}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
        {options.length < 7 && (
          <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={addOption}>
            <Plus className="size-3.5 mr-1" /> Add option
          </Button>
        )}
      </div>

      <Button type="submit" disabled={!questionText.trim() || options.some((o) => !o.label.trim()) || isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin mr-1.5" />
        ) : (
          <Plus className="size-4 mr-1.5" />
        )}
        {editingQuestion ? "Update Question" : "Add Question"}
      </Button>
    </form>
  )
}
