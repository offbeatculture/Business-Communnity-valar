import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle } from "lucide-react"
import type { Assessment, AssessmentResult } from "@/types"

type Props = {
  assessment: Assessment
  result?: AssessmentResult | null
}

export function AssessmentCard({ assessment, result }: Props) {
  const isCompleted = !!result
  const scorePercent = result && result.max_possible_score > 0
    ? Math.round((result.total_score / result.max_possible_score) * 100)
    : null

  return (
    <Link href={`/assessment/${assessment.slug}`}>
      <Card className="group hover:border-red-500/50 transition-colors h-full">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold">{assessment.title}</h3>
            {isCompleted ? (
              <Badge variant="outline" className="shrink-0 bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="size-3 mr-0.5" />
                Done
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 border-red-500/30 text-red-500">
                Take it
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground flex-1">{assessment.description}</p>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            {scorePercent !== null ? (
              <span className="text-sm font-medium">Score: {scorePercent}%</span>
            ) : (
              <span className="text-xs text-muted-foreground">+20 GP on completion</span>
            )}
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
