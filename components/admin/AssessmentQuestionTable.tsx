"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react"
import { CATEGORY_LABELS } from "@/lib/assessment-categories"
import type { AssessmentQuestion } from "@/types"
import { AssessmentQuestionForm } from "./AssessmentQuestionForm"

type Props = {
  questions: AssessmentQuestion[]
  assessmentId: string
}

export function AssessmentQuestionTable({ questions, assessmentId }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm("Delete this question?")) return

    try {
      const res = await fetch(`/api/admin/assessment/${assessmentId}/questions/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Question deleted")
      router.refresh()
    } catch {
      toast.error("Failed to delete question")
    }
  }

  async function toggleActive(question: AssessmentQuestion) {
    try {
      const res = await fetch(`/api/admin/assessment/${assessmentId}/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !question.is_active }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast.success(question.is_active ? "Deactivated" : "Activated")
      router.refresh()
    } catch {
      toast.error("Failed to update question")
    }
  }

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">No questions yet. Create one above.</p>
  }

  // Group by category
  const grouped = questions.reduce<Record<string, AssessmentQuestion[]>>((acc, q) => {
    if (!acc[q.category]) acc[q.category] = []
    acc[q.category].push(q)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, categoryQuestions]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold mb-2 capitalize">
            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category}
            <span className="text-muted-foreground font-normal ml-1">({categoryQuestions.length})</span>
          </h3>
          <div className="space-y-2">
            {categoryQuestions.map((q) => (
              <div key={q.id}>
                {editingId === q.id ? (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <AssessmentQuestionForm
                      assessmentId={assessmentId}
                      editingQuestion={q}
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
                        <p className="text-sm font-medium">{q.question_text}</p>
                        {!q.is_active && (
                          <Badge variant="secondary" className="text-xs shrink-0">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {q.options.length} options · Sort: {q.sort_order}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => toggleActive(q)}>
                        {q.is_active ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditingId(q.id)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => handleDelete(q.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
