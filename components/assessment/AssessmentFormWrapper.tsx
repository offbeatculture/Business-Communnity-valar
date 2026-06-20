"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { getAssessmentQuestionById } from "@/lib/assessment/questions"
import {
  SCREEN_GROUPS,
  getAssessmentScreenQuestionIds,
  TOTAL_ASSESSMENT_SCREENS,
} from "@/lib/assessment/sections"
import { resolveAssessmentQuestion } from "@/lib/assessment/question-overlays"
import { VERTICALS } from "@/lib/audit/types"
import type {
  AuditAnswer,
  AuditAnswers,
  AuditQuestion,
  Confidence,
  IdentityBlock,
  VerticalValue,
} from "@/lib/audit/types"
import type {
  SaveAssessmentResponse,
  SubmitAssessmentResponse,
} from "@/types/assessment"

const TOTAL_SCREENS = TOTAL_ASSESSMENT_SCREENS

type IdentityErrors = Partial<Record<keyof IdentityBlock, string>>

export type AssessmentFormWrapperProps = {
  token: string
  submissionId: string
  initialIdentity: {
    full_name: string
    business_name?: string
    phone?: string
    email: string
    city?: string
    vertical?: VerticalValue | ""
  }
  initialAnswers?: AuditAnswers
}

export function AssessmentFormWrapper({
  token,
  submissionId,
  initialIdentity,
  initialAnswers = {},
}: AssessmentFormWrapperProps) {
  const router = useRouter()
  const [identity, setIdentity] = useState<IdentityBlock>({
    full_name: initialIdentity.full_name ?? "",
    business_name: initialIdentity.business_name ?? "",
    phone: initialIdentity.phone ?? "",
    email: initialIdentity.email ?? "",
    city: initialIdentity.city ?? "",
    vertical: (initialIdentity.vertical ?? "") as VerticalValue,
  })
  const [answers, setAnswers] = useState<AuditAnswers>(initialAnswers)
  const [screen, setScreen] = useState(() =>
    computeResumeScreen(
      initialAnswers,
      (initialIdentity.vertical ?? "") as VerticalValue | "",
      {
        full_name: initialIdentity.full_name ?? "",
        business_name: initialIdentity.business_name ?? "",
        phone: initialIdentity.phone ?? "",
        email: initialIdentity.email ?? "",
        vertical: (initialIdentity.vertical ?? "") as VerticalValue | "",
      }
    )
  )
  const [submitting, setSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const lastSavedScreenRef = useRef<number | null>(screen)

  const isIdentityScreen = screen === 0
  const isLastScreen = screen === TOTAL_SCREENS - 1
  const screenIndex = screen - 1

  function setAnswer(id: string, ans: AuditAnswer) {
    setAnswers((prev) => ({ ...prev, [id]: ans }))
  }

  const identityErrors: IdentityErrors = (() => {
    const errs: IdentityErrors = {}

    if (!identity.full_name.trim() || identity.full_name.trim().length < 2) {
      errs.full_name = "Please enter your name."
    }

    if (
      !identity.business_name.trim() ||
      identity.business_name.trim().length < 2
    ) {
      errs.business_name = "Please enter your organisation or practice name."
    }

    if (!/^[6-9]\d{9}$/.test(identity.phone)) {
      errs.phone = "Enter a 10-digit Indian mobile number without +91."
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email)) {
      errs.email = "Enter a valid email address."
    }

    if (!identity.vertical) {
      errs.vertical = "Please pick the option that best matches you."
    }

    return errs
  })()

  const questionErrors: Record<string, string> = (() => {
    if (isIdentityScreen) return {}

    const errs: Record<string, string> = {}
    const qids = getAssessmentScreenQuestionIds(
      screenIndex,
      identity.vertical || null
    )

    for (const qid of qids) {
      const q = getAssessmentQuestionById(qid)
      if (!q) continue

      const ans = answers[qid]

      if (!ans) {
        errs[qid] =
          q.input_type === "number"
            ? "Please enter a number."
            : "Please pick one of the options."
        continue
      }

      if (q.input_type === "number") {
        if (typeof ans.value !== "number" || !Number.isFinite(ans.value)) {
          errs[qid] = "Please enter a number."
          continue
        }

        if (
          typeof ans.value === "number" &&
          (ans.value < q.min_value || ans.value > q.max_value)
        ) {
          errs[qid] = `Enter a number between ${q.min_value} and ${q.max_value}.`
          continue
        }
      }

      if (q.confidence_required && !ans.confidence) {
        errs[qid] = "Pick how sure you are below."
        continue
      }
    }

    return errs
  })()

  const isScreenValid = isIdentityScreen
    ? Object.keys(identityErrors).length === 0
    : Object.keys(questionErrors).length === 0

  useEffect(() => {
    if (lastSavedScreenRef.current === screen) return

    lastSavedScreenRef.current = screen

    if (screen === 0 && Object.keys(answers).length === 0) return

    const payload = {
      answers: {
        __identity: identity,
        ...answers,
      },
    }

    fetch(`/api/diagnostic/${encodeURIComponent(submissionId)}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(async (res) => {
        if (!res.ok) return
        await res.json().catch(() => ({} as SaveAssessmentResponse))
      })
      .catch(() => {})
  }, [screen, answers, identity, submissionId])

  function goNext() {
    if (!isScreenValid) {
      setShowErrors(true)

      const firstErrorId = isIdentityScreen
        ? `identity-${Object.keys(identityErrors)[0]}`
        : Object.keys(questionErrors)[0]

      requestAnimationFrame(() => {
        const el = document.getElementById(firstErrorId)
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
      })

      return
    }

    setShowErrors(false)

    if (isLastScreen) {
      handleSubmit()
      return
    }

    setScreen((s) => s + 1)

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  function goBack() {
    setShowErrors(false)
    setScreen((s) => Math.max(0, s - 1))

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  async function handleSubmit() {
    setSubmitting(true)

    try {
      const res = await fetch(
        `/api/diagnostic/${encodeURIComponent(submissionId)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: {
              __identity: identity,
              ...answers,
            },
          }),
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }))

        throw new Error(
          (data as { error?: string }).error ||
            "Submission failed. Please try again."
        )
      }

      const data = (await res.json()) as SubmitAssessmentResponse

      if (!data.ok) {
        throw new Error(data.error || "Submission failed. Please try again.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.")
      setSubmitting(false)
      return
    }

    router.push(`/assess/${encodeURIComponent(token)}/submitted`)
  }

  const progress = ((screen + 1) / TOTAL_SCREENS) * 100

  const screenTitle = isIdentityScreen
    ? "About you"
    : SCREEN_GROUPS[screenIndex].title

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Step {screen + 1} of {TOTAL_SCREENS} · {screenTitle}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-teal-500/10">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {isIdentityScreen ? (
        <IdentityBlockForm
          identity={identity}
          setIdentity={setIdentity}
          errors={showErrors ? identityErrors : {}}
          prefilledFields={{
            full_name: !!initialIdentity.full_name,
            email: !!initialIdentity.email,
          }}
        />
      ) : (
        <QuestionScreen
          questionIds={getAssessmentScreenQuestionIds(
            screenIndex,
            identity.vertical || null
          )}
          answers={answers}
          setAnswer={setAnswer}
          errors={showErrors ? questionErrors : {}}
          vertical={identity.vertical || null}
        />
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-teal-500/20 bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={screen === 0 || submitting}
            className="border-teal-500/20 hover:bg-teal-500/10"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>

          <Button
            onClick={goNext}
            disabled={submitting}
            className="min-w-[140px] bg-teal-500 text-white hover:bg-teal-600"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting…
              </>
            ) : isLastScreen ? (
              <>
                <CheckCircle className="size-4" />
                Submit check-in
              </>
            ) : (
              <>
                Next
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>

        {showErrors && !isScreenValid && (
          <p className="mt-2 flex items-center gap-1 text-xs text-red-300">
            <AlertCircle className="size-3" />
            Please complete the highlighted answers above before continuing.
          </p>
        )}
      </div>
    </div>
  )
}

function IdentityBlockForm({
  identity,
  setIdentity,
  errors,
  prefilledFields,
}: {
  identity: IdentityBlock
  setIdentity: (i: IdentityBlock) => void
  errors: IdentityErrors
  prefilledFields: { full_name: boolean; email: boolean }
}) {
  function update<K extends keyof IdentityBlock>(
    key: K,
    value: IdentityBlock[K]
  ) {
    setIdentity({ ...identity, [key]: value })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">
          A few details about you
        </h2>

        <p className="text-sm text-muted-foreground">
          We&apos;ve pre-filled what we already know. Add the rest so Dr.
          Valarmathi&apos;s team can understand your practice journey better.
        </p>
      </div>

      <Field
        id="identity-full_name"
        label="Your name"
        required
        hint={
          prefilledFields.full_name
            ? "Pre-filled from your invite — edit if it is wrong."
            : undefined
        }
        error={errors.full_name}
      >
        <Input
          value={identity.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          placeholder="Your full name"
          autoComplete="name"
          aria-invalid={!!errors.full_name}
          className="focus-visible:ring-teal-500"
        />
      </Field>

      <Field
        id="identity-business_name"
        label="Organisation / practice name"
        required
        error={errors.business_name}
      >
        <Input
          value={identity.business_name}
          onChange={(e) => update("business_name", e.target.value)}
          placeholder="Your organisation or practice name"
          autoComplete="organization"
          aria-invalid={!!errors.business_name}
          className="focus-visible:ring-teal-500"
        />
      </Field>

      <Field
        id="identity-phone"
        label="WhatsApp number"
        required
        hint="10 digits, no +91 needed"
        error={errors.phone}
      >
        <Input
          value={identity.phone}
          onChange={(e) =>
            update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          inputMode="numeric"
          placeholder="98765 43210"
          autoComplete="tel-national"
          aria-invalid={!!errors.phone}
          className="focus-visible:ring-teal-500"
        />
      </Field>

      <Field
        id="identity-email"
        label="Email"
        required
        hint={
          prefilledFields.email
            ? "Pre-filled from your invite — edit if you want updates sent elsewhere."
            : undefined
        }
        error={errors.email}
      >
        <Input
          value={identity.email}
          onChange={(e) => update("email", e.target.value)}
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          className="focus-visible:ring-teal-500"
        />
      </Field>

      <Field id="identity-city" label="City">
        <Input
          value={identity.city}
          onChange={(e) => update("city", e.target.value)}
          placeholder="Chennai"
          autoComplete="address-level2"
          className="focus-visible:ring-teal-500"
        />
      </Field>

      <Field
        id="identity-vertical"
        label="Which option best describes you?"
        required
        error={errors.vertical}
      >
        <div
          className={cn(
            "grid gap-2",
            errors.vertical && "rounded-lg p-1.5 ring-2 ring-red-300/40"
          )}
        >
          {VERTICALS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => update("vertical", v.value)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left text-sm transition-all",
                identity.vertical === v.value
                  ? "border-teal-400 bg-teal-500/10 text-foreground shadow-sm shadow-teal-500/10"
                  : "border-border hover:border-teal-400/30 hover:bg-teal-500/5"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </Field>
    </div>
  )
}

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div id={id} className="scroll-mt-20 space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-teal-300">*</span>}
      </label>

      {children}

      {error ? (
        <p className="flex items-center gap-1 text-xs text-red-300">
          <AlertCircle className="size-3" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function QuestionScreen({
  questionIds,
  answers,
  setAnswer,
  errors,
  vertical,
}: {
  questionIds: string[]
  answers: AuditAnswers
  setAnswer: (id: string, a: AuditAnswer) => void
  errors: Record<string, string>
  vertical: VerticalValue | null
}) {
  return (
    <div className="space-y-8">
      {questionIds.map((qid) => {
        const base = getAssessmentQuestionById(qid)
        if (!base) return null

        const q = resolveAssessmentQuestion(base, vertical)

        return (
          <QuestionRenderer
            key={qid}
            question={q}
            answer={answers[qid]}
            onAnswer={(a) => setAnswer(qid, a)}
            error={errors[qid]}
          />
        )
      })}
    </div>
  )
}

function QuestionRenderer({
  question,
  answer,
  onAnswer,
  error,
}: {
  question: AuditQuestion
  answer: AuditAnswer | undefined
  onAnswer: (a: AuditAnswer) => void
  error?: string
}) {
  const hasError = !!error

  return (
    <div
      id={question.id}
      className={cn(
        "scroll-mt-20 space-y-3 rounded-lg",
        hasError && "-m-3 p-3 ring-2 ring-red-300/40"
      )}
    >
      <h3 className="text-base font-medium leading-snug sm:text-lg">
        {question.question_text}
      </h3>

      {question.helper && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {question.helper}
        </p>
      )}

      {question.input_type === "number" ? (
        <NumberInput
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          hasError={hasError}
        />
      ) : (
        <ChoiceInput question={question} answer={answer} onAnswer={onAnswer} />
      )}

      {question.confidence_required && answer && (
        <ConfidenceChips
          value={answer.confidence}
          onChange={(c) => onAnswer({ ...answer, confidence: c })}
        />
      )}

      {hasError && (
        <p className="flex items-center gap-1 text-xs text-red-300">
          <AlertCircle className="size-3" />
          {error}
        </p>
      )}
    </div>
  )
}

function ChoiceInput({
  question,
  answer,
  onAnswer,
}: {
  question: AuditQuestion
  answer: AuditAnswer | undefined
  onAnswer: (a: AuditAnswer) => void
}) {
  if (question.input_type === "number") return null

  const selectedValue = answer && "value" in answer ? answer.value : null

  return (
    <div className="grid gap-2">
      {question.options.map((opt) => {
        const isSelected = selectedValue === opt.value

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              const next: AuditAnswer = {
                value: opt.value,
                score: opt.score,
                ...(opt.untracked ? { untracked: true } : {}),
                ...(answer && answer.confidence
                  ? { confidence: answer.confidence }
                  : {}),
              }

              onAnswer(next)
            }}
            className={cn(
              "min-h-[52px] rounded-lg border px-4 py-3.5 text-left text-sm transition-all",
              isSelected
                ? "border-teal-400 bg-teal-500/10 text-foreground shadow-sm shadow-teal-500/10"
                : "border-border hover:border-teal-400/30 hover:bg-teal-500/5",
              opt.untracked && !isSelected && "text-muted-foreground italic"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function NumberInput({
  question,
  answer,
  onAnswer,
  hasError,
}: {
  question: Extract<AuditQuestion, { input_type: "number" }>
  answer: AuditAnswer | undefined
  onAnswer: (a: AuditAnswer) => void
  hasError: boolean
}) {
  const current =
    answer &&
    "value" in answer &&
    typeof answer.value === "number" &&
    Number.isFinite(answer.value)
      ? String(answer.value)
      : ""

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Input
          value={current}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.]/g, "")

            if (raw === "") {
              onAnswer({
                value: NaN as unknown as number,
                unit: question.unit,
              })
              return
            }

            const n = Number(raw)

            if (Number.isNaN(n)) return

            onAnswer({
              value: n,
              unit: question.unit,
              ...(answer && answer.confidence
                ? { confidence: answer.confidence }
                : {}),
            })
          }}
          inputMode="decimal"
          placeholder="0"
          className="max-w-[200px] text-lg focus-visible:ring-teal-500"
          aria-invalid={hasError}
        />

        <span className="text-sm text-muted-foreground">{question.unit}</span>
      </div>

      {question.format_hint && (
        <p className="text-xs text-muted-foreground">{question.format_hint}</p>
      )}
    </div>
  )
}

function ConfidenceChips({
  value,
  onChange,
}: {
  value: Confidence | undefined
  onChange: (c: Confidence) => void
}) {
  const options: { value: Confidence; label: string }[] = [
    { value: "sure", label: "I'm sure" },
    { value: "approx", label: "Approximate" },
    { value: "guess", label: "I'm guessing" },
  ]

  return (
    <div className="space-y-1.5 pt-1">
      <p className="text-xs text-muted-foreground">
        How sure are you about this answer?
      </p>

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt.value

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-all",
                selected
                  ? "border-teal-400 bg-teal-500/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-teal-400/30 hover:bg-teal-500/5"
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function computeResumeScreen(
  answers: AuditAnswers,
  vertical: VerticalValue | "",
  identity: {
    full_name: string
    business_name: string
    phone: string
    email: string
    vertical: VerticalValue | ""
  }
): number {
  const identityComplete =
    identity.full_name.trim().length >= 2 &&
    identity.business_name.trim().length >= 2 &&
    /^[6-9]\d{9}$/.test(identity.phone) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email) &&
    !!identity.vertical

  if (!identityComplete) return 0

  for (let i = 0; i < TOTAL_SCREENS - 1; i++) {
    const qids = getAssessmentScreenQuestionIds(i, vertical || null)

    for (const qid of qids) {
      const q = getAssessmentQuestionById(qid)
      if (!q) continue

      const ans = answers[qid]

      if (!ans) return i + 1

      if (q.input_type === "number") {
        if (typeof ans.value !== "number" || !Number.isFinite(ans.value)) {
          return i + 1
        }
      }

      if (q.confidence_required && !ans.confidence) return i + 1
    }
  }

  return TOTAL_SCREENS - 1
}