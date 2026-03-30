import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, AlertTriangle } from "lucide-react"
import type { AssessmentResult } from "@/types"

type GenericScores = {
  categories: Record<string, number>
  maxPerCategory: Record<string, number>
}

type Props = {
  result: AssessmentResult
}

export function GenericAssessmentResults({ result }: Props) {
  const scores = result.scores as unknown as GenericScores
  const overallPercent = result.max_possible_score > 0
    ? Math.round((result.total_score / result.max_possible_score) * 100)
    : 0

  const categories = Object.entries(scores.categories ?? {}).map(([category, score]) => {
    const max = scores.maxPerCategory?.[category] ?? score
    const percent = max > 0 ? Math.round((score / max) * 100) : 0
    return { category, score, max, percent }
  })

  const strengths = categories.filter((c) => c.percent >= 80)
  const weakAreas = categories.filter((c) => c.percent < 60)

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/[0.04]">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Your Score</p>
          <p className="text-5xl font-bold tabular-nums">{overallPercent}%</p>
          <p className="text-sm text-muted-foreground mt-2">
            {result.total_score} / {result.max_possible_score} points
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-base font-semibold mb-3">Category Breakdown</h2>
        <div className="space-y-3">
          {categories.map((cat) => {
            const color = cat.percent >= 80 ? "bg-green-500" : cat.percent >= 60 ? "bg-yellow-500" : "bg-primary"
            return (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{cat.category}</span>
                  <span className="text-sm tabular-nums">{cat.percent}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${cat.percent}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {strengths.length > 0 && (
        <Card className="border-green-500/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
              <CheckCircle className="size-4 text-green-500" /> Strengths
            </h3>
            <ul className="space-y-1">
              {strengths.map((s) => (
                <li key={s.category} className="text-sm text-muted-foreground capitalize">{s.category} — {s.percent}%</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {weakAreas.length > 0 && (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
              <AlertTriangle className="size-4 text-primary" /> Areas to Improve
            </h3>
            <ul className="space-y-1">
              {weakAreas.map((w) => (
                <li key={w.category} className="text-sm text-muted-foreground capitalize">{w.category} — {w.percent}%</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Link href="/dashboard">
        <Button variant="outline" className="w-full">
          Back to Dashboard <ArrowRight className="size-4 ml-1" />
        </Button>
      </Link>
    </div>
  )
}
