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
import { KOSHAS, MAX_PER_KOSHA, asKoshaScoreBlob, bandFor } from "@/lib/kosha"
import type { Assessment, AssessmentResult } from "@/types"

type Props = {
  assessment: Assessment
  result?: AssessmentResult | null
}

export function AssessmentCard({ assessment, result }: Props) {
  const isCompleted = !!result

  // A kosha result is not a grade — a higher total means MORE imbalance, so
  // showing it as a "wellbeing score %" would read exactly backwards.
  // Surface the primary layer instead.
  const koshaScores =
    result && assessment.scoring_type === "kosha"
      ? asKoshaScoreBlob(result.scores)
      : null

  const scorePercent =
    !koshaScores && result && result.max_possible_score > 0
      ? Math.round((result.total_score / result.max_possible_score) * 100)
      : null

  return (
    <Link href={`/assessment/${assessment.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden border-[#C89B3C]/20 bg-[#F7F0E3] text-[#4B3A25] shadow-sm shadow-black/5 transition-all duration-200 hover:border-[#C89B3C]/40 hover:shadow-md hover:shadow-black/10 active:scale-[0.99]">
        <CardContent className="flex h-full flex-col p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#C89B3C]/10 text-[#8A6A22]">
                <ClipboardCheck className="size-5" />
              </div>

              <div className="min-w-0">
                <h3 className="line-clamp-1 font-serif text-lg font-semibold text-[#4B3A25]">
                  {assessment.title}
                </h3>

                <div className="mt-1 flex items-center gap-1.5 text-xs text-[#6F7358]">
                  <Clock className="size-3.5" />
                  <span>5 min check-in</span>
                </div>
              </div>
            </div>

            {isCompleted ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#6F7358]/25 bg-[#6F7358]/10 px-2 py-1 text-[11px] font-medium text-[#4B3A25]">
                <CheckCircle className="size-3.5" />
                Done
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#C89B3C]/30 bg-[#C89B3C]/10 px-2 py-1 text-[11px] font-medium text-[#8A6A22]">
                <Sparkles className="size-3.5" />
                Start
              </span>
            )}
          </div>

          <p className="line-clamp-3 flex-1 text-sm leading-6 text-[#6F7358]">
            {assessment.description}
          </p>

          <div className="mt-4 rounded-2xl border border-[#C89B3C]/20 bg-[#E8DDC8]/65 p-3">
            {koshaScores ? (
              (() => {
                const primary = KOSHAS[koshaScores.primary]
                const score = koshaScores.koshas[koshaScores.primary] ?? 0
                const band = bandFor(score)

                return (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-[#6F7358]">
                        <Gauge className="size-3.5" />
                        Primary layer
                      </span>

                      <span className="text-sm font-bold text-[#8A6A22]">
                        {score}/{MAX_PER_KOSHA}
                      </span>
                    </div>

                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#F7F0E3]">
                      <div
                        className={`h-full rounded-full ${band.bar}`}
                        style={{ width: `${(score / MAX_PER_KOSHA) * 100}%` }}
                      />
                    </div>

                    <p className="text-xs font-medium text-[#4B3A25]">
                      {primary.name}{" "}
                      <span className="font-normal text-[#6F7358]">
                        · {band.label}
                      </span>
                    </p>
                  </div>
                )
              })()
            ) : scorePercent !== null ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-[#6F7358]">
                    <Gauge className="size-3.5" />
                    Wellbeing score
                  </span>

                  <span className="text-sm font-bold text-[#8A6A22]">
                    {scorePercent}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[#F7F0E3]">
                  <div
                    className="h-full rounded-full bg-[#C89B3C]"
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#4B3A25]">
                    Unlock your breathwork insight
                  </p>

                  <p className="text-xs text-[#6F7358]">
                    Complete it to get practice recommendations.
                  </p>
                </div>

                <span className="text-xs font-medium text-[#8A6A22]">
                  +20 Points
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#C89B3C]/20 pt-3">
            <span className="text-xs font-medium text-[#6F7358]">
              {isCompleted ? "View your result" : "Start check-in"}
            </span>

            <div className="flex size-8 items-center justify-center rounded-full bg-[#E8DDC8] text-[#6F7358] transition group-hover:bg-[#C89B3C] group-hover:text-[#122015]">
              <ArrowRight className="size-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}