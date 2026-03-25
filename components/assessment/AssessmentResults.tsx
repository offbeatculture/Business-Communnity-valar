import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, AlertTriangle, Sparkles } from "lucide-react"
import { PILLAR_KEYS, PILLAR_NAMES, type ScaleCodeResult, type PillarKey } from "@/lib/scale-code"
import type { AssessmentResult } from "@/types"

type Props = {
  result: AssessmentResult
}

function getScoreColor(score: number) {
  if (score >= 8) return { bar: "bg-green-500", text: "text-green-500" }
  if (score >= 5) return { bar: "bg-yellow-500", text: "text-yellow-500" }
  return { bar: "bg-red-500", text: "text-red-500" }
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500/10 text-red-500 border-red-500/20",
  HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  LOW: "bg-muted text-muted-foreground",
  MAINTAIN: "bg-green-500/10 text-green-500 border-green-500/20",
  OPTIMIZE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  IGNORE: "bg-muted text-muted-foreground",
}

export function AssessmentResults({ result }: Props) {
  const scores = result.scores as unknown as ScaleCodeResult
  const overallPercent = result.max_possible_score > 0
    ? Math.round((result.total_score / result.max_possible_score) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Section 1: Score Card */}
      <Card className="border-red-500/20 bg-gradient-to-br from-card to-red-500/[0.04] overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Score circle */}
            <div className="flex flex-col items-center">
              <div className="relative size-24">
                <svg className="size-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-secondary" />
                  <circle
                    cx="48" cy="48" r="40" fill="none" strokeWidth="6"
                    className="text-red-500"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallPercent / 100)}`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                  {overallPercent}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Business Score</p>
            </div>

            {/* Archetype + Stage */}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Archetype</p>
                <p className="text-xl font-bold">{scores.archetype.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{scores.archetype.story}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Stage: {scores.stage}
                </Badge>
                <span className="text-xs text-muted-foreground">{scores.stageRevenue}</span>
              </div>
            </div>
          </div>

          {/* Archetype context */}
          {scores.archetype.context && (
            <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border/50">
              {scores.archetype.context}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: 8 Pillar Bars */}
      <div>
        <h2 className="text-base font-semibold mb-3">The 8 Pillars</h2>
        <div className="space-y-3">
          {PILLAR_KEYS.map((key) => {
            const score = scores.pillars[key]
            const isFloor = scores.floor.pillarKey === key
            const color = getScoreColor(score)
            const priority = scores.priorities[key]

            return (
              <div key={key} className={`space-y-1 ${isFloor ? "rounded-lg border border-red-500/30 bg-red-500/[0.03] p-3 -mx-3" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{PILLAR_NAMES[key]}</span>
                    {isFloor && (
                      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">
                        <AlertTriangle className="size-3 mr-0.5" />
                        YOUR FLOOR
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[priority] ?? ""}`}>
                      {priority}
                    </Badge>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${color.text}`}>{score}/10</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
                    style={{ width: `${score * 10}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 3: Floor Recommendation */}
      <Card className="border-red-500/30 bg-red-500/[0.03]">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold">Your Floor: {scores.floor.pillarName}</h3>
              <p className="text-sm text-muted-foreground mt-2">{scores.recommendation}</p>
              <Link
                href={`/prompts?category=${scores.floor.pillarKey}`}
                className="inline-flex items-center gap-1 text-sm text-red-500 hover:underline mt-3"
              >
                <Sparkles className="size-3.5" />
                Browse {scores.floor.pillarName} prompts
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Priority Actions */}
      <div>
        <h2 className="text-base font-semibold mb-3">Priority at Your Stage</h2>
        <div className="grid grid-cols-2 gap-2">
          {PILLAR_KEYS
            .filter((key) => scores.priorities[key] === "CRITICAL" || scores.priorities[key] === "HIGH")
            .map((key) => (
              <Link key={key} href={`/prompts?category=${key}`}>
                <Card className="h-full hover:border-red-500/30 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{PILLAR_NAMES[key]}</span>
                      <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[scores.priorities[key]] ?? ""}`}>
                        {scores.priorities[key]}
                      </Badge>
                    </div>
                    <span className={`text-lg font-bold tabular-nums ${getScoreColor(scores.pillars[key]).text}`}>
                      {scores.pillars[key]}/10
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/prompts" className="flex-1">
          <Button variant="outline" className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10">
            Browse All Prompts <ArrowRight className="size-4 ml-1" />
          </Button>
        </Link>
        <Link href="/dashboard" className="flex-1">
          <Button variant="outline" className="w-full">
            Back to Dashboard <ArrowRight className="size-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
