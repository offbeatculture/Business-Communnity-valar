import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Info, Lock } from "lucide-react"
import {
  KOSHAS,
  MAX_PER_KOSHA,
  SCAN_DISCLAIMER,
  bandFor,
  rankKoshas,
  retakeStatus,
  type KoshaScoreBlob,
} from "@/lib/kosha"

type Props = {
  scores: KoshaScoreBlob
  completedAt: string
  attemptNumber: number
  /** Shown when a previous attempt exists to compare against. */
  hasComparison?: boolean
}

export function KoshaResults({
  scores,
  completedAt,
  attemptNumber,
  hasComparison,
}: Props) {
  const ranked = rankKoshas(scores.koshas)
  const primary = KOSHAS[scores.primary]
  const secondary = KOSHAS[scores.secondary]
  const primaryScore = scores.koshas[scores.primary]
  const primaryBand = bandFor(primaryScore)

  const retake = retakeStatus(completedAt)

  return (
    <div className="space-y-6 text-[#4B3A25]">
      {/* Primary layer */}
      <div className="rounded-3xl border border-[#C89B3C]/30 bg-gradient-to-br from-[#F7F0E3] to-[#F7F0E3]/40 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#8A6A22]">
          Your primary layer
        </p>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
              {primary.name}
            </h2>
            <p className="mt-0.5 text-sm font-medium text-[#6F7358]">
              {primary.sheath} · Week {primary.week}
            </p>
          </div>

          <div className="text-right">
            <p className="font-serif text-4xl font-semibold tabular-nums">
              {primaryScore}
              <span className="text-xl text-[#6F7358]">/{MAX_PER_KOSHA}</span>
            </p>
            <span
              className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${primaryBand.chip}`}
            >
              {primaryBand.label}
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm font-medium leading-6 text-[#6F7358]">
          {primaryBand.meaning}
        </p>

        <p className="mt-3 border-t border-[#C89B3C]/20 pt-3 text-sm font-medium leading-6 text-[#6F7358]">
          Your second layer is{" "}
          <span className="font-semibold text-[#4B3A25]">{secondary.name}</span> —
          worth watching as the primary one settles.
        </p>
      </div>

      {/* All five layers */}
      <div>
        <h3 className="mb-3 font-serif text-lg font-semibold">
          All five layers
        </h3>

        <div className="space-y-3.5">
          {ranked.map((key) => {
            const kosha = KOSHAS[key]
            const score = scores.koshas[key] ?? 0
            const band = bandFor(score)
            const pct = (score / MAX_PER_KOSHA) * 100
            const isPrimary = key === scores.primary

            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{kosha.name}</span>
                    <span className="text-xs font-medium text-[#6F7358]">
                      {kosha.sheath}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {score}
                    <span className="text-[#6F7358]">/{MAX_PER_KOSHA}</span>
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-[#C89B3C]/12">
                  <div
                    className={`h-full rounded-full ${band.bar} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${band.text}`}>
                    {band.label}
                  </span>
                  {isPrimary && (
                    <span className="text-xs font-medium text-[#8A6A22]">
                      · focus here first
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Band key */}
      <div className="rounded-2xl border border-[#C89B3C]/20 bg-white/50 p-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8A6A22]">
          How to read a score
        </h4>
        <ul className="space-y-1.5 text-sm font-medium leading-6 text-[#6F7358]">
          <li>
            <span className="font-semibold text-[#59603F]">0–10</span> — relatively
            balanced right now.
          </li>
          <li>
            <span className="font-semibold text-[#8A6A22]">11–20</span> — moderate
            imbalance, needs consistent practice.
          </li>
          <li>
            <span className="font-semibold text-[#8E3F1F]">21–30</span> — very likely
            today&apos;s root cause.
          </li>
        </ul>
      </div>

      {/* Dr Valar's framing, verbatim */}
      <div className="flex gap-3 rounded-2xl border border-[#6F7358]/25 bg-[#6F7358]/[0.06] p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-[#6F7358]" />
        <p className="text-sm font-medium leading-6 text-[#6F7358]">
          {SCAN_DISCLAIMER}
        </p>
      </div>

      {/* Next steps */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        {hasComparison && (
          <Link href="/assessment/kosha-scan/progress" className="flex-1">
            <Button className="w-full bg-[#C89B3C] text-white hover:bg-[#B4882F]">
              See your progress
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        )}

        {retake.eligible ? (
          <Link href="/assessment/kosha-scan?retake=1" className="flex-1">
            <Button
              variant={hasComparison ? "outline" : "default"}
              className={
                hasComparison
                  ? "w-full"
                  : "w-full bg-[#C89B3C] text-white hover:bg-[#B4882F]"
              }
            >
              Retake the scan
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        ) : (
          <Link href="/content" className="flex-1">
            <Button variant="outline" className="w-full">
              This week&apos;s practice
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        )}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-[#6F7358]">
        {retake.eligible ? (
          <>Scan {attemptNumber} · your reassessment is open</>
        ) : (
          <>
            <Lock className="size-3" />
            Scan {attemptNumber} · reassessment opens in {retake.daysRemaining} day
            {retake.daysRemaining === 1 ? "" : "s"}
          </>
        )}
      </p>
    </div>
  )
}
