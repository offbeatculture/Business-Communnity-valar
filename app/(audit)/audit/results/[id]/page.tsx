import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { CheckCircle2, AlertTriangle, Eye, Target } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeVerdict, FORCE_LABELS, type AuditVerdict } from "@/lib/audit/verdict"
import type { Signal, ForceScore } from "@/lib/audit/scoring"
import type { PlaybookVariant } from "@/lib/audit/playbook"
import { getOverlay } from "@/lib/audit/playbook-overlays"
import type { AuditAnswers, ForceKey, VerticalValue } from "@/lib/audit/types"
import { FORCE_KEYS, VERTICALS } from "@/lib/audit/types"

export const dynamic = "force-dynamic"

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminClient()
  const { data: submission, error } = await admin
    .from("audit_submissions")
    .select("id, full_name, business_name, vertical, answers, submitted_at")
    .eq("id", id)
    .single()

  if (error || !submission) notFound()

  const answers = submission.answers as AuditAnswers
  const verdict = computeVerdict(answers)
  const applicableVariants = matchApplicableVariants(verdict, answers)
  const vertical = submission.vertical as VerticalValue | null
  const verticalLabel =
    VERTICALS.find((v) => v.value === vertical)?.label ?? null
  const overlay = getOverlay(vertical, verdict.focus_force)

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Audit verdict · {submission.business_name}
        </p>
        <p className="text-xs text-muted-foreground">
          {submission.full_name} · submitted{" "}
          {new Date(submission.submitted_at).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </header>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Your focus force
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
          {verdict.focus_force_label}
        </h1>
        <p className="text-base text-muted-foreground max-w-prose leading-relaxed">
          {verdict.focus_reason}
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Your named move · {verdict.named_move.duration}
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {verdict.named_move.title}
          </h2>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
            The promise
          </p>
          <p className="text-sm leading-relaxed">{verdict.named_move.promise}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
            The diagnosis
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <Markdown text={verdict.named_move.diagnosis} />
          </p>
        </div>
      </section>

      {overlay && verticalLabel && (
        <section className="rounded-lg border border-primary/30 bg-primary/5 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              For your {verticalLabel}
            </p>
          </div>
          <p className="text-sm leading-relaxed">
            <Markdown text={overlay.content} />
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">The moves</h2>
        <ol className="space-y-3">
          {verdict.named_move.moves.map((m, i) => (
            <li
              key={i}
              className="rounded-lg border border-border bg-card p-4 space-y-1.5"
            >
              <p className="font-medium text-sm">
                {i + 1}. {m.title}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <Markdown text={m.body} />
              </p>
            </li>
          ))}
        </ol>
      </section>

      {applicableVariants.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Specific to your situation
          </h2>
          {applicableVariants.map((v, i) => (
            <div
              key={i}
              className="rounded-lg border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-1.5"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Variant — {v.label}
              </p>
              <p className="text-sm leading-relaxed">
                <Markdown text={v.body} />
              </p>
            </div>
          ))}
        </section>
      )}

      {(verdict.signals.strengths.length > 0 ||
        verdict.signals.risks.length > 0 ||
        verdict.signals.blind_spots.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">What we saw</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {verdict.signals.strengths.length > 0 && (
              <SignalCard
                title="Strengths"
                icon={
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-500" />
                }
                signals={verdict.signals.strengths}
              />
            )}
            {verdict.signals.risks.length > 0 && (
              <SignalCard
                title="Risks"
                icon={
                  <AlertTriangle className="size-4 text-rose-600 dark:text-rose-500" />
                }
                signals={verdict.signals.risks}
              />
            )}
            {verdict.signals.blind_spots.length > 0 && (
              <SignalCard
                title="Blind spots"
                icon={
                  <Eye className="size-4 text-amber-600 dark:text-amber-500" />
                }
                signals={verdict.signals.blind_spots}
              />
            )}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">All 8 force scores</h2>
        <p className="text-xs text-muted-foreground">
          Lowest = your focus force. When scores cluster within 0.3, foundation
          forces win (Identity → X-Factor → Financial → Marketing → Sales →
          Optimisation → Scale → Owner Energy) — unless your named bottleneck
          overrides.
        </p>
        <div className="space-y-2.5">
          {FORCE_KEYS.map((force) => (
            <ForceBar
              key={force}
              force={force}
              score={verdict.scores[force]}
              isFocus={force === verdict.focus_force}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground space-y-1">
        <p>
          Revenue:{" "}
          {verdict.context.revenue_lakhs !== null
            ? `₹${verdict.context.revenue_lakhs} lakhs`
            : "—"}{" "}
          {verdict.context.stage_tag ? `(${verdict.context.stage_tag})` : ""}
        </p>
        <p>Headcount: {verdict.context.headcount ?? "—"}</p>
        <p>Founder age: {verdict.context.founder_age ?? "—"}</p>
        <p>Vertical: {submission.vertical}</p>
      </section>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────

function SignalCard({
  title,
  icon,
  signals,
}: {
  title: string
  icon: ReactNode
  signals: Signal[]
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-sm font-medium">{title}</p>
      </div>
      <ul className="space-y-1.5">
        {signals.map((s) => (
          <li
            key={s.question_id}
            className="text-xs leading-relaxed text-muted-foreground"
          >
            {s.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ForceBar({
  force,
  score,
  isFocus,
}: {
  force: ForceKey
  score: ForceScore
  isFocus: boolean
}) {
  const pct = Math.max(0, Math.min(100, (score.score / 5) * 100))
  return (
    <div className={isFocus ? "rounded-md bg-primary/5 px-2 py-1.5 -mx-2" : ""}>
      <div className="flex items-baseline justify-between text-sm">
        <span className={isFocus ? "font-semibold" : ""}>
          {FORCE_LABELS[force]}
          {isFocus && (
            <span className="ml-2 text-xs font-normal text-primary">
              ← focus
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {score.score.toFixed(1)} / 5
          {score.untracked > 0
            ? ` · ${score.untracked} blind spot${score.untracked > 1 ? "s" : ""}`
            : ""}
        </span>
      </div>
      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isFocus ? "bg-primary" : "bg-muted-foreground/40"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// Inline markdown: **bold** and *italic*.
function Markdown({ text }: { text: string }) {
  // Split first on bold; then on italic within each non-bold segment.
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g)
  const out: ReactNode[] = []
  let key = 0
  for (const seg of boldParts) {
    if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4) {
      out.push(<strong key={key++}>{seg.slice(2, -2)}</strong>)
    } else {
      const italicParts = seg.split(/(\*[^*]+\*)/g)
      for (const ip of italicParts) {
        if (ip.startsWith("*") && ip.endsWith("*") && ip.length > 2) {
          out.push(<em key={key++}>{ip.slice(1, -1)}</em>)
        } else if (ip) {
          out.push(<span key={key++}>{ip}</span>)
        }
      }
    }
  }
  return <>{out}</>
}

// ─── Variant matching ──────────────────────────────────────

function matchApplicableVariants(
  verdict: AuditVerdict,
  answers: AuditAnswers,
): PlaybookVariant[] {
  const focus = verdict.focus_force
  const variants = verdict.named_move.variants
  if (variants.length === 0) return []

  const numValue = (qid: string): number | null => {
    const a = answers[qid]
    if (!a || !("value" in a)) return null
    return typeof a.value === "number" ? a.value : null
  }
  const isUntracked = (qid: string): boolean => {
    const a = answers[qid]
    return !!(a && "untracked" in a && a.untracked)
  }
  const choiceValue = (qid: string): string | null => {
    const a = answers[qid]
    if (!a || !("value" in a)) return null
    return typeof a.value === "string" ? a.value : null
  }

  return variants.filter((v) => {
    const label = v.label.toLowerCase()
    if (focus === "x_factor" && label.includes("60%")) {
      const conc = numValue("q3_top3_concentration")
      return conc !== null && conc >= 60
    }
    if (focus === "marketing" && label.includes("cpl or conversion")) {
      return isUntracked("q5_cpl") || isUntracked("q6_conversion")
    }
    if (focus === "sales" && label.includes("conversion")) {
      return isUntracked("q6_conversion")
    }
    if (focus === "financial" && label.includes("runway")) {
      const runway = answers["q10_cash_runway"]
      const runwayValue = runway && "value" in runway ? String(runway.value) : null
      return isUntracked("q10_cash_runway") || runwayValue === "lt_1" || runwayValue === "1_3"
    }
    if (focus === "financial" && label.includes("margin")) {
      return isUntracked("q9_gross_margin")
    }
    if (focus === "optimisation" && label.includes("solo")) {
      const headcount = numValue("q12_headcount")
      return headcount !== null && headcount <= 1
    }
    if (focus === "scale") {
      const q13 = choiceValue("q13_bottleneck")
      if (label.includes("owner_time")) return q13 === "owner_time"
      if (label.includes("team")) return q13 === "team"
      if (label.includes("systems")) return q13 === "systems"
      if (label.includes("cash or supply")) return q13 === "cash" || q13 === "supply"
    }
    if (focus === "owner_energy" && label.includes("done")) {
      return choiceValue("q14_owner_energy") === "done"
    }
    return false
  })
}
