import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowDown, ArrowUp, Minus, TriangleAlert } from "lucide-react"
import {
  MAX_PER_KOSHA,
  MEANINGFUL_DROP,
  type KoshaComparison as Comparison,
} from "@/lib/kosha"

type Props = {
  comparison: Comparison
  beforeDate: string
  afterDate: string
  attempts: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

export function KoshaComparison({
  comparison,
  beforeDate,
  afterDate,
  attempts,
}: Props) {
  const {
    deltas,
    originalPrimary,
    currentPrimary,
    primaryChanged,
    meaningfulShift,
    totalBefore,
    totalAfter,
    polarityMismatch,
  } = comparison

  const primaryDrop = originalPrimary.before - originalPrimary.after

  return (
    <div className="space-y-6 text-[#4B3A25]">
      {/* Scores were computed under different polarity config — say so
          rather than quietly showing an invalid comparison. */}
      {polarityMismatch && (
        <div className="flex gap-3 rounded-2xl border border-[#B4532A]/30 bg-[#B4532A]/[0.07] p-4">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#8E3F1F]" />
          <p className="text-sm font-medium leading-6 text-[#8E3F1F]">
            These two scans were scored using different settings, so the
            before-and-after numbers are not directly comparable.
          </p>
        </div>
      )}

      {/* Headline */}
      <div className="rounded-3xl border border-[#C89B3C]/30 bg-gradient-to-br from-[#F7F0E3] to-[#F7F0E3]/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#8A6A22]">
            Your month
          </p>
          <p className="text-xs font-medium text-[#6F7358]">
            {formatDate(beforeDate)} → {formatDate(afterDate)}
          </p>
        </div>

        <h2 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">
          {originalPrimary.kosha.name}
        </h2>

        <div className="mt-3 flex items-end gap-3">
          <span className="font-serif text-4xl font-semibold tabular-nums text-[#6F7358]/60">
            {originalPrimary.before}
          </span>
          <ArrowRight className="mb-2 size-5 text-[#6F7358]" />
          <span className="font-serif text-5xl font-semibold tabular-nums">
            {originalPrimary.after}
          </span>
          <span className="mb-2 text-lg font-medium text-[#6F7358]">
            /{MAX_PER_KOSHA}
          </span>
        </div>

        <p className="mt-4 text-sm font-medium leading-6 text-[#6F7358]">
          {primaryDrop > 0 ? (
            <>
              Your primary layer dropped{" "}
              <span className="font-semibold text-[#59603F]">
                {primaryDrop} point{primaryDrop === 1 ? "" : "s"}
              </span>
              {meaningfulShift ? (
                <> — a real, visible shift, not noise.</>
              ) : (
                <>. Movement is starting, even if it is small.</>
              )}
            </>
          ) : primaryDrop === 0 ? (
            <>
              Your primary layer held steady. Nothing moved backwards — this layer
              is asking for more consistent practice.
            </>
          ) : (
            <>
              Your primary layer rose {Math.abs(primaryDrop)} point
              {Math.abs(primaryDrop) === 1 ? "" : "s"}. Worth talking through on the
              Sunday call.
            </>
          )}
        </p>

        {primaryChanged && (
          <p className="mt-3 border-t border-[#C89B3C]/20 pt-3 text-sm font-medium leading-6 text-[#6F7358]">
            Your primary layer is now{" "}
            <span className="font-semibold text-[#4B3A25]">
              {currentPrimary.kosha.name}
            </span>{" "}
            — that is where next month&apos;s focus goes.
          </p>
        )}
      </div>

      {/* Layer by layer */}
      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-lg font-semibold">Layer by layer</h3>
          <span className="flex items-center gap-1.5 text-xs font-medium text-[#6F7358]">
            <span className="inline-block h-3 w-[3px] rounded-full bg-[#4B3A25]/60" />
            where you started
          </span>
        </div>

        <div className="space-y-4">
          {deltas.map((d) => {
            const beforePct = (d.before / MAX_PER_KOSHA) * 100
            const afterPct = (d.after / MAX_PER_KOSHA) * 100
            const isOriginalPrimary = d.kosha.key === originalPrimary.kosha.key

            return (
              <div key={d.kosha.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold">{d.kosha.name}</span>
                    {isOriginalPrimary && (
                      <span className="text-xs font-medium text-[#8A6A22]">
                        your primary layer
                      </span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-baseline gap-2 text-sm tabular-nums">
                    <span className="font-medium text-[#6F7358]/70">{d.before}</span>
                    <ArrowRight className="size-3 self-center text-[#6F7358]/50" />
                    <span className="font-semibold">{d.after}</span>
                    <DeltaChip delta={d.delta} />
                  </div>
                </div>

                {/* The filled bar is where they are now; the tick is where
                    they started. Drawing intake as a second bar behind this
                    one hides it completely whenever a score went UP, which
                    is exactly the case a member most needs to see. */}
                <div className="relative h-2.5 overflow-hidden rounded-full bg-[#C89B3C]/12">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${d.afterBand.bar}`}
                    style={{ width: `${afterPct}%` }}
                  />
                  <div
                    className={`absolute inset-y-0 w-[3px] -translate-x-1/2 rounded-full ${
                      // A score that went UP puts the tick inside the filled
                      // bar, where a dark mark disappears against the fill.
                      d.after >= d.before ? "bg-[#F7F0E3]" : "bg-[#4B3A25]/60"
                    }`}
                    style={{ left: `${Math.min(99, Math.max(1, beforePct))}%` }}
                    aria-hidden
                  />
                </div>

                <p className={`text-xs font-semibold ${d.afterBand.text}`}>
                  {d.beforeBand.label !== d.afterBand.label ? (
                    <>
                      {d.beforeBand.label} → {d.afterBand.label}
                    </>
                  ) : (
                    d.afterBand.label
                  )}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Totals */}
      <div className="flex items-center justify-between rounded-2xl border border-[#C89B3C]/20 bg-white/50 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#8A6A22]">
            Across all five layers
          </p>
          <p className="mt-0.5 text-xs font-medium text-[#6F7358]">
            Scan 1 → Scan {attempts}
          </p>
        </div>
        <div className="flex items-baseline gap-2 text-lg tabular-nums">
          <span className="font-medium text-[#6F7358]/70">{totalBefore}</span>
          <ArrowRight className="size-3.5 self-center text-[#6F7358]/50" />
          <span className="font-serif text-2xl font-semibold">{totalAfter}</span>
          <DeltaChip delta={totalAfter - totalBefore} />
        </div>
      </div>

      <p className="text-center text-xs font-medium leading-5 text-[#6F7358]">
        A drop of {MEANINGFUL_DROP}–8 points on your primary layer is a concrete
        marker of progress.
      </p>

      <Link href="/assessment/kosha-scan">
        <Button variant="outline" className="w-full">
          Back to your scan
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </Link>
    </div>
  )
}

/** Negative delta = the layer quietened = good. */
function DeltaChip({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full border border-[#6F7358]/25 bg-[#6F7358]/10 px-1.5 py-0.5 text-xs font-semibold text-[#59603F]">
        <Minus className="size-3" />0
      </span>
    )
  }

  const improved = delta < 0

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs font-semibold ${
        improved
          ? "border-[#6F7358]/30 bg-[#6F7358]/10 text-[#59603F]"
          : "border-[#B4532A]/30 bg-[#B4532A]/10 text-[#8E3F1F]"
      }`}
    >
      {improved ? (
        <ArrowDown className="size-3" />
      ) : (
        <ArrowUp className="size-3" />
      )}
      {Math.abs(delta)}
    </span>
  )
}
