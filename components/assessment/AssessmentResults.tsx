import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Flame,
  Gauge,
  Sparkles,
  Target,
} from "lucide-react"
import {
  PILLAR_KEYS,
  PILLAR_NAMES,
  type ScaleCodeResult,
} from "@/lib/scale-code"
import type { AssessmentResult } from "@/types"

type Props = {
  result: AssessmentResult
}

function getScoreColor(score: number) {
  if (score >= 8) {
    return {
      bar: "bg-green-500",
      text: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    }
  }

  if (score >= 5) {
    return {
      bar: "bg-yellow-500",
      text: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
    }
  }

  return {
    bar: "bg-primary",
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  }
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-primary/10 text-primary border-primary/20",
  HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  LOW: "bg-muted text-muted-foreground border-border",
  MAINTAIN: "bg-green-500/10 text-green-500 border-green-500/20",
  OPTIMIZE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  IGNORE: "bg-muted text-muted-foreground border-border",
}

export function AssessmentResults({ result }: Props) {
  const scores = result.scores as unknown as ScaleCodeResult

  const overallPercent =
    result.max_possible_score > 0
      ? Math.round((result.total_score / result.max_possible_score) * 100)
      : 0

  const priorityPillars = PILLAR_KEYS.filter(
    (key) =>
      scores.priorities[key] === "CRITICAL" ||
      scores.priorities[key] === "HIGH"
  )

  return (
    <div className="space-y-5">
      {/* Result hero */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-lg shadow-primary/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4 sm:block sm:text-center">
              <div className="relative size-20 shrink-0 sm:mx-auto sm:size-24">
                <svg
                  className="size-20 -rotate-90 sm:size-24"
                  viewBox="0 0 96 96"
                >
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    className="text-secondary"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    strokeWidth="7"
                    className="text-primary"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 40 * (1 - overallPercent / 100)
                    }`}
                  />
                </svg>

                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold sm:text-2xl">
                  {overallPercent}%
                </span>
              </div>

              <div className="sm:mt-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Business Score
                </p>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Gauge className="size-3.5" />
                Your Archetype
              </div>

              <h2 className="text-xl font-bold sm:text-2xl">
                {scores.archetype.name}
              </h2>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {scores.archetype.story}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full">
                  Stage: {scores.stage}
                </Badge>

                <span className="text-xs text-muted-foreground">
                  {scores.stageRevenue}
                </span>
              </div>
            </div>
          </div>

          {scores.archetype.context && (
            <div className="mt-5 rounded-2xl border border-border/60 bg-background/40 p-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {scores.archetype.context}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floor recommendation */}
      <Card className="border-primary/25 bg-primary/[0.04]">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <AlertTriangle className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Your Floor
              </p>

              <h3 className="mt-1 text-base font-semibold">
                {scores.floor.pillarName}
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {scores.recommendation}
              </p>

              <Link
                href={`/prompts?category=${scores.floor.pillarKey}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Sparkles className="size-3.5" />
                Browse {scores.floor.pillarName} prompts
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8 Pillars */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">The 8 Pillars</h2>
            <p className="text-xs text-muted-foreground">
              See where your business is strongest and weakest.
            </p>
          </div>

          <BarChart3 className="size-5 text-muted-foreground" />
        </div>

        <div className="space-y-2.5">
          {PILLAR_KEYS.map((key) => {
            const score = scores.pillars[key]
            const isFloor = scores.floor.pillarKey === key
            const color = getScoreColor(score)
            const priority = scores.priorities[key]

            return (
              <div
                key={key}
                className={`rounded-2xl border p-3 transition ${
                  isFloor
                    ? "border-primary/30 bg-primary/[0.04]"
                    : "border-border/60 bg-card"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        {PILLAR_NAMES[key]}
                      </p>

                      {isFloor && (
                        <Badge
                          variant="outline"
                          className="rounded-full border-primary/20 bg-primary/10 text-[10px] text-primary"
                        >
                          <AlertTriangle className="mr-0.5 size-3" />
                          FLOOR
                        </Badge>
                      )}

                      <Badge
                        variant="outline"
                        className={`rounded-full text-[10px] ${
                          PRIORITY_COLORS[priority] ?? ""
                        }`}
                      >
                        {priority}
                      </Badge>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 text-sm font-bold tabular-nums ${color.text}`}
                  >
                    {score}/10
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
                    style={{ width: `${score * 10}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Priority Actions */}
      {priorityPillars.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Priority at Your Stage</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {priorityPillars.map((key) => {
              const score = scores.pillars[key]
              const priority = scores.priorities[key]
              const color = getScoreColor(score)

              return (
                <Link key={key} href={`/prompts?category=${key}`}>
                  <Card
                    className={`h-full transition hover:border-primary/35 hover:shadow-md hover:shadow-primary/5 ${
                      scores.floor.pillarKey === key
                        ? "border-primary/30"
                        : "border-border/60"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {PILLAR_NAMES[key]}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Focus area
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className={`rounded-full text-[10px] ${
                            PRIORITY_COLORS[priority] ?? ""
                          }`}
                        >
                          {priority}
                        </Badge>
                      </div>

                      <div className="flex items-end justify-between">
                        <span
                          className={`text-2xl font-bold tabular-nums ${color.text}`}
                        >
                          {score}/10
                        </span>

                        {scores.floor.pillarKey === key ? (
                          <Flame className="size-5 text-primary" />
                        ) : (
                          <CheckCircle2 className="size-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* CTAs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/prompts">
          <Button
            variant="outline"
            className="h-11 w-full border-primary/30 text-primary hover:bg-primary/10"
          >
            Browse All Prompts <ArrowRight className="ml-1 size-4" />
          </Button>
        </Link>

        <Link href="/dashboard">
          <Button variant="outline" className="h-11 w-full">
            Back to Dashboard <ArrowRight className="ml-1 size-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}