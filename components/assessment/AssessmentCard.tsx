import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowRight,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Gauge,
  Sparkles,
} from "lucide-react"
import type { Assessment, AssessmentResult } from "@/types"

type Props = {
  assessment: Assessment
  result?: AssessmentResult | null
}

export function AssessmentCard({ assessment, result }: Props) {
  const isCompleted = !!result

  const scorePercent =
    result && result.max_possible_score > 0
      ? Math.round((result.total_score / result.max_possible_score) * 100)
      : null

  return (
    <Link href={`/assessment/${assessment.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden border-border/60 bg-card transition-all duration-200 hover:border-primary/35 hover:shadow-md hover:shadow-primary/5 active:scale-[0.99]">
        <CardContent className="flex h-full flex-col p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardCheck className="size-5" />
              </div>

              <div className="min-w-0">
                <h3 className="line-clamp-1 text-base font-semibold">
                  {assessment.title}
                </h3>

                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  <span>5 min diagnosis</span>
                </div>
              </div>
            </div>

            {isCompleted ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-[11px] font-medium text-green-500">
                <CheckCircle className="size-3.5" />
                Done
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                <Sparkles className="size-3.5" />
                Start
              </span>
            )}
          </div>

          <p className="line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">
            {assessment.description}
          </p>

          <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-3">
            {scorePercent !== null ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Gauge className="size-3.5" />
                    Business score
                  </span>

                  <span className="text-sm font-bold text-primary">
                    {scorePercent}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Unlock your diagnosis</p>
                  <p className="text-xs text-muted-foreground">
                    Complete it to get recommendations.
                  </p>
                </div>

                <span className="text-xs font-medium text-primary">+20 GP</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
            <span className="text-xs font-medium text-muted-foreground">
              {isCompleted ? "View your result" : "Start assessment"}
            </span>

            <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowRight className="size-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}