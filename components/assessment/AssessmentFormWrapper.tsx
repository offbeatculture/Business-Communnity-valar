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

// ════════════════════════════════════════════════════════════
// AssessmentFormWrapper — invite-aware variant of AuditForm
// ════════════════════════════════════════════════════════════
// Why this exists (Option B — thin variant, not a wrapper):
//
// The existing `components/audit/AuditForm.tsx` takes no props,
// hardcodes `useState(INITIAL_IDENTITY)` with empty values, posts
// to /api/audit/submit, fires a separate /api/audit/send-report,
// and redirects to /audit/results/[id]. All of its sub-components
// (IdentityBlockForm, QuestionScreen, etc.) are private (not
// exported). There is no clean way to inject initial identity
// values or override the submit endpoint via composition without
// modifying that file — which the supervisor explicitly forbade.
//
// So this is a parallel orchestrator that reuses the shared logic
// that LIVES IN lib/assessment/* (the long-form question bank,
// sections, overlays, scoring) — which itself builds on top of
// lib/audit/* primitives without modifying them. The
// per-screen rendering primitives (Field, ChoiceInput, etc.) are
// re-implemented here in a self-contained way so the two forms
// can evolve independently without coupling. If/when AuditForm is
// refactored to accept `initialIdentity` and an `onSubmit` prop,
// this file can shrink to a thin call into it.
//
// Behavioural deltas vs AuditForm:
//   - identity pre-populated from invite (name + email locked
//     visually but still editable, per spec "Allows them to edit
//     identity fields if needed")
//   - submit POSTs to /api/diagnostic/[submissionId]/submit
//   - NO follow-up email-on-submit fetch (invite_assessment
//     submissions route through the approval queue; the API
//     handles emailing later)
//   - success navigates to /assess/[token]/submitted
//   - on every screen transition we fire-and-forget POST to
//     /api/diagnostic/[submissionId]/save (no UI feedback)

const TOTAL_SCREENS = TOTAL_ASSESSMENT_SCREENS

type IdentityErrors = Partial<Record<keyof IdentityBlock, string>>

export type AssessmentFormWrapperProps = {
  token: string
  submissionId: string
  initialIdentity: {
    full_name: string
    email: string
  }
}

export function AssessmentFormWrapper({
  token,
  submissionId,
  initialIdentity,
}: AssessmentFormWrapperProps) {
  const router = useRouter()
  const [screen, setScreen] = useState(0)
  const [identity, setIdentity] = useState<IdentityBlock>({
    full_name: initialIdentity.full_name ?? "",
    business_name: "",
    phone: "",
    email: initialIdentity.email ?? "",
    city: "",
    vertical: "" as VerticalValue,
  })
  const [answers, setAnswers] = useState<AuditAnswers>({})
  const [submitting, setSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const lastSavedScreenRef = useRef<number | null>(null)

  const isIdentityScreen = screen === 0
  const isLastScreen = screen === TOTAL_SCREENS - 1
  const screenIndex = screen - 1

  function setAnswer(id: string, ans: AuditAnswer) {
    setAnswers((prev) => ({ ...prev, [id]: ans }))
  }

  // ─── Validation (mirrors AuditForm) ────────────────────────
  const identityErrors: IdentityErrors = (() => {
    const errs: IdentityErrors = {}
    if (!identity.full_name.trim() || identity.full_name.trim().length < 2) {
      errs.full_name = "Please enter your name."
    }
    if (
      !identity.business_name.trim() ||
      identity.business_name.trim().length < 2
    ) {
      errs.business_name = "Please enter your business name."
    }
    if (!/^[6-9]\d{9}$/.test(identity.phone)) {
      errs.phone = "Enter a 10-digit Indian mobile number (no +91)."
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email)) {
      errs.email = "Enter a valid email address."
    }
    if (!identity.vertical) {
      errs.vertical = "Please pick the kind of business you run."
    }
    return errs
  })()

  const questionErrors: Record<string, string> = (() => {
    if (isIdentityScreen) return {}
    const errs: Record<string, string> = {}
    const qids = getAssessmentScreenQuestionIds(screenIndex, identity.vertical || null)
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

  // ─── Save progress (fire-and-forget) ────────────────────────
  // Runs after each successful screen transition. We dedupe per
  // screen with a ref so we don't spam if the user toggles back
  // and forth without changing anything.
  useEffect(() => {
    if (lastSavedScreenRef.current === screen) return
    lastSavedScreenRef.current = screen
    // Don't bother saving from the identity screen on first mount.
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
        // Soft validation — we don't surface errors. Parse so logs
        // are clean if the body is empty/JSON.
        await res.json().catch(() => ({} as SaveAssessmentResponse))
      })
      .catch(() => {
        // Swallow — phase 1 nice-to-have, no UI feedback.
      })
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
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function goBack() {
    setShowErrors(false)
    setScreen((s) => Math.max(0, s - 1))
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" })
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
        const data = await res
          .json()
          .catch(() => ({} as { error?: string }))
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

    // Invite_assessment submissions route through the approval queue
    // — no client-side email send here. Off to the confirmation page.
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
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
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

      <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-background border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={screen === 0 || submitting}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button
            onClick={goNext}
            disabled={submitting}
            className="min-w-[140px]"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting…
              </>
            ) : isLastScreen ? (
              <>
                <CheckCircle className="size-4" />
                Submit assessment
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
          <p className="mt-2 text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="size-3" />
            Please complete the highlighted answers above before continuing.
          </p>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Identity block — same shape as AuditForm's, with subtle
// "we pre-filled this from your invite" hint on pre-filled fields.
// ════════════════════════════════════════════════════════════

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
          We&apos;ve pre-filled what we already know. Add the rest so we can
          benchmark you against the right sector.
        </p>
      </div>

      <Field
        id="identity-full_name"
        label="Your name"
        required
        hint={
          prefilledFields.full_name
            ? "Pre-filled from your invite — edit if it's wrong."
            : undefined
        }
        error={errors.full_name}
      >
        <Input
          value={identity.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          placeholder="Rajesh Mehta"
          autoComplete="name"
          aria-invalid={!!errors.full_name}
        />
      </Field>

      <Field
        id="identity-business_name"
        label="Business name"
        required
        error={errors.business_name}
      >
        <Input
          value={identity.business_name}
          onChange={(e) => update("business_name", e.target.value)}
          placeholder="Mehta Furniture Industries"
          autoComplete="organization"
          aria-invalid={!!errors.business_name}
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
        />
      </Field>

      <Field
        id="identity-email"
        label="Email"
        required
        hint={
          prefilledFields.email
            ? "Pre-filled from your invite — edit if you want the report sent elsewhere."
            : undefined
        }
        error={errors.email}
      >
        <Input
          value={identity.email}
          onChange={(e) => update("email", e.target.value)}
          type="email"
          placeholder="rajesh@example.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
        />
      </Field>

      <Field id="identity-city" label="City">
        <Input
          value={identity.city}
          onChange={(e) => update("city", e.target.value)}
          placeholder="Pune"
          autoComplete="address-level2"
        />
      </Field>

      <Field
        id="identity-vertical"
        label="What business are you in?"
        required
        error={errors.vertical}
      >
        <div
          className={cn(
            "grid gap-2",
            errors.vertical && "ring-2 ring-destructive/40 rounded-lg p-1.5"
          )}
        >
          {VERTICALS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => update("vertical", v.value)}
              className={cn(
                "text-left text-sm px-4 py-3 rounded-lg border transition-all",
                identity.vertical === v.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border hover:border-primary/30 hover:bg-muted/50"
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
    <div id={id} className="space-y-1.5 scroll-mt-20">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="size-3" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Question screen + renderers (parallel to AuditForm)
// ════════════════════════════════════════════════════════════

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
        "space-y-3 scroll-mt-20 rounded-lg",
        hasError && "ring-2 ring-destructive/40 p-3 -m-3"
      )}
    >
      <h3 className="text-base sm:text-lg font-medium leading-snug">
        {question.question_text}
      </h3>
      {question.helper && (
        <p className="text-xs text-muted-foreground leading-relaxed">
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
        <p className="text-xs text-destructive flex items-center gap-1">
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
              "text-left text-sm px-4 py-3.5 rounded-lg border transition-all min-h-[52px]",
              isSelected
                ? "border-primary bg-primary/10 text-foreground shadow-sm"
                : "border-border hover:border-primary/30 hover:bg-muted/50",
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
          className="text-lg max-w-[200px]"
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
        How sure are you about this number?
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
                "text-xs px-3 py-1.5 rounded-full border transition-all",
                selected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/30"
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
