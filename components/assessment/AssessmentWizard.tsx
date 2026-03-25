"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import { CATEGORY_LABELS } from "@/lib/assessment-categories"
import type { AssessmentQuestion } from "@/types"

type Props = {
  questions: AssessmentQuestion[]
  assessmentSlug: string
}

export function AssessmentWizard({ questions, assessmentSlug }: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentQuestion = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1
  const isAnswered = !!answers[currentQuestion?.id]
  const isRevenue = currentQuestion?.category === "revenue"

  function selectAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/assessment/${assessmentSlug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to submit")
      }

      toast.success("Assessment complete! +20 GP earned")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit assessment")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!currentQuestion) return null

  const pillarLabel = CATEGORY_LABELS[currentQuestion.category] ?? currentQuestion.category

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">
            {isRevenue ? "Final Question" : pillarLabel}
          </p>
          <h2 className="text-lg font-semibold mb-4">{currentQuestion.question_text}</h2>

          <div className="space-y-2.5">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => selectAnswer(currentQuestion.id, opt.value)}
                className={`w-full text-left text-sm px-4 py-3 rounded-lg border transition-all ${
                  answers[currentQuestion.id] === opt.value
                    ? "border-red-500 bg-red-500/10 text-foreground shadow-sm"
                    : "border-border hover:border-red-500/30 hover:bg-muted/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => i - 1)}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Button>

        {isLast ? (
          <Button onClick={handleSubmit} disabled={!isAnswered || isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : (
              <CheckCircle className="size-4 mr-1" />
            )}
            See My Results
          </Button>
        ) : (
          <Button onClick={() => setCurrentIndex((i) => i + 1)} disabled={!isAnswered}>
            Next
            <ArrowRight className="size-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
