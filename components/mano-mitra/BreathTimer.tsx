"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw, Check, TriangleAlert } from "lucide-react"
import type { BreathPattern } from "@/lib/mano-mitra"

type Props = {
  pattern: BreathPattern
  /** Migraine-safe mode: no animation, dimmed, no motion. */
  stillMode?: boolean
  onDone: () => void
}

export function BreathTimer({ pattern, stillMode, onDone }: Props) {
  const isCounted = pattern.mode === "counted"

  const [running, setRunning] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [round, setRound] = useState(1)
  const [elapsedInPhase, setElapsedInPhase] = useState(0)
  const [totalElapsed, setTotalElapsed] = useState(0)
  const [finished, setFinished] = useState(false)

  // Memoised: this feeds the interval effect, and a fresh array each
  // render would tear down and restart the timer every tick.
  const phases = useMemo(() => pattern.phases ?? [], [pattern.phases])
  const totalRounds = pattern.rounds ?? 1
  const totalDuration = pattern.duration ?? 0
  const currentPhase = phases[phaseIndex]

  // One interval drives everything. Refs hold the live values so the
  // effect never needs to re-subscribe mid-practice — restarting the
  // interval on every tick would drift the timing audibly.
  const stateRef = useRef({ phaseIndex, round, elapsedInPhase, totalElapsed })
  stateRef.current = { phaseIndex, round, elapsedInPhase, totalElapsed }

  useEffect(() => {
    if (!running || finished) return

    const id = setInterval(() => {
      const s = stateRef.current

      if (isCounted) {
        const phase = phases[s.phaseIndex]
        const next = s.elapsedInPhase + 1

        if (next >= phase.seconds) {
          const lastPhase = s.phaseIndex === phases.length - 1
          if (lastPhase) {
            if (s.round >= totalRounds) {
              setRunning(false)
              setFinished(true)
              return
            }
            setRound((r) => r + 1)
            setPhaseIndex(0)
          } else {
            setPhaseIndex((p) => p + 1)
          }
          setElapsedInPhase(0)
        } else {
          setElapsedInPhase(next)
        }
      } else {
        const next = s.totalElapsed + 1
        if (next >= totalDuration) {
          setTotalElapsed(totalDuration)
          setRunning(false)
          setFinished(true)
          return
        }
        setTotalElapsed(next)
      }
    }, 1000)

    return () => clearInterval(id)
  }, [running, finished, isCounted, phases, totalRounds, totalDuration])

  function reset() {
    setRunning(false)
    setFinished(false)
    setPhaseIndex(0)
    setRound(1)
    setElapsedInPhase(0)
    setTotalElapsed(0)
  }

  // Circle scale tracks the phase: expanding on an in-breath, settling on
  // an out-breath. Held flat in still mode.
  const phaseProgress = currentPhase
    ? elapsedInPhase / currentPhase.seconds
    : 0
  const isInhale = /in\b|in naturally|second breath in/i.test(currentPhase?.label ?? "")
  const scale = stillMode
    ? 1
    : isCounted
      ? isInhale
        ? 0.65 + phaseProgress * 0.35
        : 1 - phaseProgress * 0.35
      : 1

  const remaining = isCounted
    ? Math.max(0, (currentPhase?.seconds ?? 0) - elapsedInPhase)
    : Math.max(0, totalDuration - totalElapsed)

  const overallProgress = isCounted
    ? ((round - 1) * phases.length + phaseIndex + phaseProgress) /
      (totalRounds * phases.length)
    : totalDuration > 0
      ? totalElapsed / totalDuration
      : 0

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[#8A6A22]">
          Breathwork {pattern.number}
        </p>
        <h3 className="mt-1 font-serif text-xl font-semibold text-[#4B3A25]">
          {pattern.name}
        </h3>
        <p className="mt-1 text-sm font-medium text-[#6F7358]">
          For {pattern.useFor.toLowerCase()}
        </p>
      </div>

      {/* The circle */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative flex size-56 items-center justify-center">
          <div
            className={`absolute rounded-full ${stillMode ? "" : "transition-transform duration-1000 ease-linear"}`}
            style={{
              width: "14rem",
              height: "14rem",
              transform: `scale(${scale})`,
              backgroundColor: "rgba(200,155,60,0.16)",
              border: "2px solid rgba(200,155,60,0.45)",
            }}
          />

          <div className="relative text-center">
            {finished ? (
              <p className="font-serif text-2xl font-semibold text-[#4B3A25]">
                Done
              </p>
            ) : (
              <>
                <p className="font-serif text-xl font-semibold text-[#4B3A25]">
                  {running
                    ? isCounted
                      ? currentPhase?.label
                      : "Observe"
                    : "Ready"}
                </p>
                <p className="mt-1 font-serif text-4xl font-semibold tabular-nums text-[#8A6A22]">
                  {isCounted
                    ? remaining
                    : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
                </p>
                {isCounted && (
                  <p className="mt-1 text-xs font-medium text-[#6F7358]">
                    Round {round} of {totalRounds}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[#C89B3C]/15">
          <div
            className="h-full rounded-full bg-[#C89B3C] transition-all duration-500"
            style={{ width: `${Math.min(100, overallProgress * 100)}%` }}
          />
        </div>
      </div>

      {/* Guidance */}
      <p className="rounded-2xl border border-[#C89B3C]/20 bg-white/50 p-3.5 text-center text-sm font-medium leading-6 text-[#6F7358]">
        {pattern.guidance}
      </p>

      {pattern.safety && (
        <div className="flex gap-3 rounded-2xl border border-[#B4532A]/30 bg-[#B4532A]/[0.07] p-3.5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#8E3F1F]" />
          <p className="text-sm font-medium leading-6 text-[#8E3F1F]">
            {pattern.safety}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {!finished && (
          <Button
            onClick={() => setRunning((r) => !r)}
            className="bg-[#C89B3C] text-white hover:bg-[#B4882F]"
          >
            {running ? (
              <>
                <Pause className="mr-1 size-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-1 size-4" />
                {totalElapsed > 0 || elapsedInPhase > 0 || round > 1
                  ? "Resume"
                  : "Begin"}
              </>
            )}
          </Button>
        )}

        {(running || finished || totalElapsed > 0 || round > 1) && (
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-1 size-4" />
            Restart
          </Button>
        )}

        <Button
          variant={finished ? "default" : "outline"}
          onClick={onDone}
          className={finished ? "bg-[#6F7358] text-white hover:bg-[#5F6349]" : ""}
        >
          <Check className="mr-1 size-4" />
          {finished ? "Continue" : "Skip this"}
        </Button>
      </div>

      {/* Stopping early is always allowed and never framed as failure. */}
      <p className="text-center text-xs font-medium text-[#6F7358]">
        You can stop at any point. Comfort matters more than completing the
        count.
      </p>
    </div>
  )
}
