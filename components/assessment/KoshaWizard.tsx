"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import { KOSHA_LIST, isKoshaKey, type KoshaKey } from "@/lib/kosha"
import type { AssessmentQuestion } from "@/types"

type Props = {
  questions: AssessmentQuestion[]
  assessmentSlug: string
  /** Retakes get different copy — they're a re-measure, not a first look. */
  isRetake?: boolean
}

const SCALE = [
  { value: "0", short: "0" },
  { value: "1", short: "1" },
  { value: "2", short: "2" },
  { value: "3", short: "3" },
  { value: "4", short: "4" },
  { value: "5", short: "5" },
]

/**
 * 0 → 5 severity ramp, sage green through gold to terracotta. Warm tones
 * rather than traffic-light green/red, to sit inside the Valar palette.
 *
 * Two ramps, same hues at different depths:
 *   TINT — the vivid shade, used for the unselected fill and border.
 *   DEEP — a darkened shade, used for the numeral and for the selected
 *          fill. White on the vivid gold (#C89B3C) is only ~2.1:1, which
 *          fails contrast badly; on the deep shade it clears 5:1.
 */
const TINT_RAMP = [
  "#5F7355",
  "#7D8B4A",
  "#A89A42",
  "#C89B3C",
  "#BE7635",
  "#B4532A",
] as const

const DEEP_RAMP = [
  "#44543C",
  "#5A6633",
  "#6E6324",
  "#7A5D1E",
  "#8E5423",
  "#8E3F1F",
] as const

/**
 * Green must always mean "this layer is doing well".
 *
 * Four of the five koshas are worded as problems, so a high answer is the
 * troubled end and the ramp runs green → red. Anandamaya's statements are
 * worded as health ("I feel grateful for my life as it is right now"), so
 * there a high answer is the GOOD end and the ramp has to run the other
 * way — otherwise we would paint contentment red.
 *
 * This reads the same `reverse` flag the scoring uses (lib/kosha.ts), so
 * if those six statements are ever reworded to negative polarity, the
 * gradient falls back in line automatically.
 */
function rampFor(reverse: boolean) {
  return {
    tint: reverse ? [...TINT_RAMP].reverse() : [...TINT_RAMP],
    deep: reverse ? [...DEEP_RAMP].reverse() : [...DEEP_RAMP],
  }
}

export function KoshaWizard({ questions, assessmentSlug, isRetake }: Props) {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // One step per kosha, in the program's teaching order.
  const steps = useMemo(() => {
    const byKosha = new Map<KoshaKey, AssessmentQuestion[]>()
    for (const q of questions) {
      if (!isKoshaKey(q.category)) continue
      const list = byKosha.get(q.category) ?? []
      list.push(q)
      byKosha.set(q.category, list)
    }
    return KOSHA_LIST.map((kosha) => ({
      kosha,
      questions: (byKosha.get(kosha.key) ?? []).sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    })).filter((s) => s.questions.length > 0)
  }, [questions])

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1
  const answeredInStep = step?.questions.filter((q) => answers[q.id]).length ?? 0
  const stepComplete = step ? answeredInStep === step.questions.length : false

  const totalAnswered = Object.keys(answers).length
  const progress = questions.length > 0 ? (totalAnswered / questions.length) * 100 : 0

  function selectAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function goTo(next: number) {
    setStepIndex(next)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/assessment/${assessmentSlug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit")

      toast.success(
        isRetake ? "Reassessment complete." : "Your Panchakosha Scan is ready."
      )
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit the scan")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!step) return null

  const ramp = rampFor(step.kosha.reverse)

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-[#6F7358]">
          <span>
            Layer {stepIndex + 1} of {steps.length}
          </span>
          <span className="tabular-nums">
            {totalAnswered} / {questions.length} answered
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#C89B3C]/15">
          <div
            className="h-full rounded-full bg-[#C89B3C] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Layer heading — deliberately does NOT explain what a high score
          means. Members who know the scoring tend to steer their answers. */}
      <div className="rounded-2xl border border-[#C89B3C]/25 bg-[#F7F0E3]/70 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[#8A6A22]">
          Week {step.kosha.week} · {step.kosha.sheath}
        </p>
        <h2 className="mt-1 font-serif text-xl font-semibold text-[#4B3A25]">
          {step.kosha.name}
        </h2>
        <p className="mt-1 text-sm font-medium text-[#6F7358]">
          Score each statement from 0 (not at all true) to 5 (extremely true).
        </p>
      </div>

      {/* Statements */}
      <div className="space-y-3">
        {step.questions.map((q, i) => {
          const selected = answers[q.id]
          return (
            <div
              key={q.id}
              className="rounded-2xl border border-[#C89B3C]/20 bg-white/60 p-4 sm:p-5"
            >
              <div className="mb-3 flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#C89B3C]/15 text-xs font-bold tabular-nums text-[#8A6A22]">
                  {i + 1}
                </span>
                <p className="text-sm font-medium leading-6 text-[#4B3A25]">
                  {q.question_text}
                </p>
              </div>

              <div className="flex gap-1.5 pl-9">
                {SCALE.map((opt, idx) => {
                  const active = selected === opt.value
                  const tint = ramp.tint[idx]
                  const deep = ramp.deep[idx]

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => selectAnswer(q.id, opt.value)}
                      aria-pressed={active}
                      aria-label={`${opt.value} out of 5`}
                      style={
                        active
                          ? {
                              backgroundColor: deep,
                              borderColor: deep,
                              color: "#fff",
                              boxShadow: `0 0 0 3px ${tint}40`,
                            }
                          : {
                              backgroundColor: `${tint}24`,
                              borderColor: `${tint}70`,
                              color: deep,
                            }
                      }
                      className={`flex h-11 flex-1 items-center justify-center rounded-lg border text-sm font-bold tabular-nums transition-all ${
                        active ? "scale-[1.04]" : "hover:brightness-95"
                      }`}
                    >
                      {opt.short}
                    </button>
                  )
                })}
              </div>

              {/* Anchors carry the ramp's end colours so the scale reads at
                  a glance without anyone having to decode the numbers. */}
              <div className="mt-2 flex items-center justify-between pl-9 text-[11px] font-bold">
                <span
                  className="rounded-md px-1.5 py-0.5"
                  style={{
                    color: ramp.deep[0],
                    backgroundColor: `${ramp.tint[0]}24`,
                  }}
                >
                  Not at all true
                </span>
                <span
                  className="rounded-md px-1.5 py-0.5"
                  style={{
                    color: ramp.deep[5],
                    backgroundColor: `${ramp.tint[5]}24`,
                  }}
                >
                  Extremely true
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => goTo(stepIndex - 1)}
          disabled={stepIndex === 0}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Button>

        {isLast ? (
          <Button
            onClick={handleSubmit}
            disabled={!stepComplete || isSubmitting}
            className="bg-[#C89B3C] text-white hover:bg-[#B4882F]"
          >
            {isSubmitting ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-1 size-4" />
            )}
            {isRetake ? "See my progress" : "See my results"}
          </Button>
        ) : (
          <Button
            onClick={() => goTo(stepIndex + 1)}
            disabled={!stepComplete}
            className="bg-[#C89B3C] text-white hover:bg-[#B4882F]"
          >
            Next layer
            <ArrowRight className="ml-1 size-4" />
          </Button>
        )}
      </div>

      {!stepComplete && (
        <p className="text-center text-xs font-medium text-[#6F7358]">
          {step.questions.length - answeredInStep} statement
          {step.questions.length - answeredInStep === 1 ? "" : "s"} left in this layer
        </p>
      )}
    </div>
  )
}
