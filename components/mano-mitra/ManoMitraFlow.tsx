"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BreathTimer } from "./BreathTimer"
import {
  ACTIVITIES, BODY_DISCLAIMER, BODY_PROMPT, BODY_ZONES, CHAKRA_DISCLAIMER,
  COMPLETION_CLOSING, COMPLETION_TITLE, CRISIS_RESOURCES, EMOTIONS,
  EMOTION_PROMPT, INTENSITY_PROMPT, MIGRAINE_RED_FLAGS,
  MIGRAINE_RED_FLAG_MESSAGE, MIGRAINE_SAFE_GUIDANCE, NEEDS, NEED_PROMPT,
  POST_FEELINGS, POST_INTENSITY_PROMPT, PRODUCT_STEPS, SAFETY_QUESTION,
  SAFETY_STOP_MESSAGE, SENSATIONS, SENSATION_PROMPT, TRIGGERS, TRIGGER_PROMPT,
  needsMigraineTriage, postOutcome, routeFor,
  type BodyZoneId, type EmotionId, type PostFeelingId,
} from "@/lib/mano-mitra"
import {
  ArrowLeft, ArrowRight, Heart, LifeBuoy, Phone, ShieldAlert, Sparkles,
} from "lucide-react"

type Step =
  | "safety" | "stopped" | "emotion" | "body" | "sensation"
  | "migraine" | "migraine_stop"
  | "context" | "activity" | "breath" | "post" | "done"

export function ManoMitraFlow({ priorHighIntensity }: { priorHighIntensity: number }) {
  const [step, setStep] = useState<Step>("safety")
  const [emotion, setEmotion] = useState<EmotionId | null>(null)
  const [zone, setZone] = useState<BodyZoneId | null>(null)
  const [sensation, setSensation] = useState<string | null>(null)
  const [intensity, setIntensity] = useState(5)
  const [trigger, setTrigger] = useState<string | null>(null)
  const [need, setNeed] = useState<string | null>(null)
  const [migraineFlags, setMigraineFlags] = useState<number[]>([])
  const [stillMode, setStillMode] = useState(false)
  const [intensityAfter, setIntensityAfter] = useState(5)
  const [feeling, setFeeling] = useState<PostFeelingId | null>(null)
  const [nextAction, setNextAction] = useState("")

  const route = emotion ? routeFor(emotion) : null

  async function save(outcome: "cleared" | "stopped" | "migraine_flagged", complete: boolean) {
    try {
      await fetch("/api/mano-mitra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safety_outcome: outcome,
          emotion_id: emotion,
          chakra: route?.chakra.key ?? null,
          body_zone: zone,
          sensation,
          intensity_before: emotion ? intensity : null,
          trigger_context: trigger,
          need,
          activity_id: route?.activity.id ?? null,
          breath_id: route?.breath.id ?? null,
          intensity_after: complete ? intensityAfter : null,
          post_feeling: complete ? feeling : null,
          next_action: complete ? nextAction.trim() || null : null,
          completed: complete,
        }),
      })
    } catch {
      // A failed save must never block someone mid-practice.
    }
  }

  // ── Step 1 · Safety ───────────────────────────────────────
  if (step === "safety") {
    return (
      <Shell>
        <div className="rounded-3xl border border-[#B4532A]/30 bg-[#B4532A]/[0.06] p-6">
          <ShieldAlert className="mb-3 size-6 text-[#8E3F1F]" />
          <p className="text-base font-medium leading-7 text-[#4B3A25]">
            {SAFETY_QUESTION}
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Button
              onClick={() => setStep("emotion")}
              className="flex-1 bg-[#6F7358] text-white hover:bg-[#5F6349]"
            >
              No — continue
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                save("stopped", false)
                setStep("stopped")
              }}
              className="flex-1 border-[#B4532A]/40 text-[#8E3F1F] hover:bg-[#B4532A]/10"
            >
              Yes — I need support
            </Button>
          </div>
        </div>
      </Shell>
    )
  }

  if (step === "stopped") return <SupportScreen message={SAFETY_STOP_MESSAGE} />

  // ── Step 2 · Emotion ──────────────────────────────────────
  if (step === "emotion") {
    return (
      <Shell onBack={() => setStep("safety")}>
        <Question text={EMOTION_PROMPT} />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {EMOTIONS.map((e) => (
            <Choice
              key={e.id}
              label={e.label}
              selected={emotion === e.id}
              onClick={() => {
                setEmotion(e.id)
                setStep("body")
              }}
            />
          ))}
        </div>
        <Muted>Choose the one that feels strongest. You can return for another.</Muted>
      </Shell>
    )
  }

  // ── Step 3 · Body ─────────────────────────────────────────
  if (step === "body") {
    return (
      <Shell onBack={() => setStep("emotion")}>
        <Question text={BODY_PROMPT} />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {BODY_ZONES.map((z) => (
            <Choice
              key={z.id}
              label={z.label}
              selected={zone === z.id}
              onClick={() => {
                setZone(z.id)
                setStep(needsMigraineTriage(z.id) ? "migraine" : "sensation")
              }}
            />
          ))}
        </div>
        <Note>{BODY_DISCLAIMER}</Note>
      </Shell>
    )
  }

  // ── Migraine triage ───────────────────────────────────────
  if (step === "migraine") {
    return (
      <Shell onBack={() => setStep("body")}>
        <Question text="Before we continue — does any of this apply to your head pain right now?" />
        <div className="space-y-2.5">
          {MIGRAINE_RED_FLAGS.map((flag, i) => (
            <Choice
              key={i}
              label={flag}
              selected={migraineFlags.includes(i)}
              onClick={() =>
                setMigraineFlags((f) =>
                  f.includes(i) ? f.filter((x) => x !== i) : [...f, i]
                )
              }
            />
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Button
            onClick={() => {
              if (migraineFlags.length > 0) {
                save("migraine_flagged", false)
                setStep("migraine_stop")
              } else {
                setStillMode(true)
                setStep("sensation")
              }
            }}
            className="flex-1 bg-[#C89B3C] text-white hover:bg-[#B4882F]"
          >
            Continue
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
        <Muted>Select any that apply, or none.</Muted>
      </Shell>
    )
  }

  if (step === "migraine_stop") {
    return <SupportScreen message={MIGRAINE_RED_FLAG_MESSAGE} />
  }

  // ── Sensation ─────────────────────────────────────────────
  if (step === "sensation") {
    return (
      <Shell onBack={() => setStep("body")}>
        <Question text={SENSATION_PROMPT} />
        <div className="flex flex-wrap gap-2">
          {SENSATIONS.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={sensation === s}
              onClick={() => {
                setSensation(s)
                setStep("context")
              }}
            />
          ))}
        </div>
      </Shell>
    )
  }

  // ── Step 4 · Intensity and context ────────────────────────
  if (step === "context") {
    return (
      <Shell onBack={() => setStep("sensation")}>
        <Question text={INTENSITY_PROMPT} />
        <IntensitySlider value={intensity} onChange={setIntensity} />

        <div className="mt-7">
          <Question text={TRIGGER_PROMPT} />
          <div className="flex flex-wrap gap-2">
            {TRIGGERS.map((t) => (
              <Chip key={t} label={t} selected={trigger === t} onClick={() => setTrigger(t)} />
            ))}
          </div>
        </div>

        <div className="mt-7">
          <Question text={NEED_PROMPT} />
          <div className="flex flex-wrap gap-2">
            {NEEDS.map((n) => (
              <Chip key={n} label={n} selected={need === n} onClick={() => setNeed(n)} />
            ))}
          </div>
        </div>

        <Button
          onClick={() => setStep("activity")}
          disabled={!trigger || !need}
          className="mt-7 w-full bg-[#C89B3C] text-white hover:bg-[#B4882F]"
        >
          Continue
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </Shell>
    )
  }

  // ── Step 5 · Activity ─────────────────────────────────────
  if (step === "activity" && route) {
    const activity = ACTIVITIES[route.chakra.activityId]
    return (
      <Shell onBack={() => setStep("context")}>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#8A6A22]">
            {route.chakra.name} · {route.chakra.pattern}
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-[#4B3A25]">
            {activity.title}
          </h2>
          {activity.intro && (
            <p className="mt-2 text-sm font-medium text-[#6F7358]">{activity.intro}</p>
          )}
        </div>

        {activity.columns && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            {activity.columns.map((c) => (
              <div
                key={c}
                className="rounded-2xl border border-[#C89B3C]/25 bg-white/60 p-3"
              >
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8A6A22]">
                  {c}
                </p>
                <textarea
                  rows={4}
                  className="w-full resize-none rounded-lg border border-[#C89B3C]/25 bg-white p-2 text-sm text-[#4B3A25]"
                />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {activity.steps.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#C89B3C]/20 bg-white/60 p-4"
            >
              {s.instruction && (
                <p className="text-sm font-medium leading-6 text-[#4B3A25]">
                  {s.instruction}
                </p>
              )}

              {(s.prompt || s.completion) && (
                <>
                  <p className="mb-2 text-sm font-medium leading-6 text-[#4B3A25]">
                    {s.prompt ?? `${s.completion}…`}
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Write here — this stays on your device"
                    className="w-full resize-none rounded-lg border border-[#C89B3C]/25 bg-white p-2.5 text-sm text-[#4B3A25] placeholder:text-[#6F7358]/50"
                  />
                </>
              )}
            </div>
          ))}
        </div>

        {activity.note && <Note>{activity.note}</Note>}

        <div className="mt-5 rounded-2xl border border-[#6F7358]/25 bg-[#6F7358]/[0.07] p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#59603F]">
            {activity.closingLabel}
          </p>
          <p className="mt-1.5 font-serif text-lg leading-7 text-[#4B3A25]">
            {activity.closing}
          </p>
        </div>

        <Button
          onClick={() => setStep("breath")}
          className="mt-5 w-full bg-[#C89B3C] text-white hover:bg-[#B4882F]"
        >
          Continue to breathwork
          <ArrowRight className="ml-1 size-4" />
        </Button>

        <Note>{CHAKRA_DISCLAIMER}</Note>
      </Shell>
    )
  }

  // ── Step 6 · Breath ───────────────────────────────────────
  if (step === "breath" && route) {
    return (
      <Shell onBack={() => setStep("activity")}>
        {stillMode && (
          <Note>
            Still mode is on — no motion, no flashing. {MIGRAINE_SAFE_GUIDANCE[0]}.
          </Note>
        )}
        <BreathTimer
          pattern={route.breath}
          stillMode={stillMode}
          onDone={() => {
            setIntensityAfter(intensity)
            setStep("post")
          }}
        />
      </Shell>
    )
  }

  // ── Post-check ────────────────────────────────────────────
  if (step === "post" && route) {
    const outcome = feeling
      ? postOutcome(intensity, intensityAfter, feeling, priorHighIntensity)
      : null

    return (
      <Shell>
        <Question text={POST_INTENSITY_PROMPT} />
        <IntensitySlider value={intensityAfter} onChange={setIntensityAfter} />

        <div className="mt-7">
          <Question text="How are you now?" />
          <div className="space-y-2.5">
            {POST_FEELINGS.map((f) => (
              <Choice
                key={f.id}
                label={f.label}
                selected={feeling === f.id}
                onClick={() => setFeeling(f.id)}
              />
            ))}
          </div>
        </div>

        {outcome && (
          <div
            className={`mt-5 rounded-2xl border p-4 ${
              outcome.tone === "stop" || outcome.tone === "connect"
                ? "border-[#B4532A]/30 bg-[#B4532A]/[0.07]"
                : "border-[#6F7358]/25 bg-[#6F7358]/[0.07]"
            }`}
          >
            <p className="text-sm font-medium leading-6 text-[#4B3A25]">
              {outcome.message}
            </p>

            {outcome.showSupport && (
              <div className="mt-3 space-y-1.5 border-t border-[#B4532A]/20 pt-3">
                {CRISIS_RESOURCES.map((r) => (
                  <p key={r.name} className="text-sm font-medium text-[#8E3F1F]">
                    <span className="font-bold">{r.number}</span> — {r.name}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <Button
          onClick={() => {
            save("cleared", true)
            setStep("done")
          }}
          disabled={!feeling}
          className="mt-6 w-full bg-[#C89B3C] text-white hover:bg-[#B4882F]"
        >
          Finish
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </Shell>
    )
  }

  // ── Completion ────────────────────────────────────────────
  if (step === "done" && route && emotion) {
    const chosen = EMOTIONS.find((e) => e.id === emotion)!
    return (
      <Shell>
        <div className="text-center">
          <Sparkles className="mx-auto mb-3 size-7 text-[#C89B3C]" />
          <h2 className="font-serif text-2xl font-semibold text-[#4B3A25]">
            {COMPLETION_TITLE}
          </h2>
        </div>

        <div className="mt-6 rounded-3xl border border-[#C89B3C]/30 bg-gradient-to-br from-[#F7F0E3] to-[#F7F0E3]/40 p-5">
          <p className="font-serif text-lg leading-8 text-[#4B3A25]">
            {route.acknowledgement}
          </p>
        </div>

        <dl className="mt-5 space-y-2 rounded-2xl border border-[#C89B3C]/20 bg-white/50 p-4 text-sm">
          <Row label="Emotion" value={chosen.label} />
          <Row label="Body sensation" value={[zoneLabel(zone), sensation].filter(Boolean).join(" · ") || "—"} />
          <Row label="Intensity before" value={`${intensity} / 10`} />
          <Row label="Activity" value={route.activity.title} />
          <Row label="Breathwork" value={route.breath.name} />
          <Row label="Intensity after" value={`${intensityAfter} / 10`} />
        </dl>

        <div className="mt-5">
          <label className="text-sm font-semibold text-[#4B3A25]">
            One next action
          </label>
          <input
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            onBlur={() => save("cleared", true)}
            placeholder="The one small thing you will do next"
            maxLength={200}
            className="mt-1.5 w-full rounded-lg border border-[#C89B3C]/25 bg-white px-3 py-2 text-sm text-[#4B3A25]"
          />
        </div>

        <p className="mt-5 text-sm font-medium leading-6 text-[#6F7358]">
          {COMPLETION_CLOSING}
        </p>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/events" className="flex-1">
            <Button variant="outline" className="w-full">
              Next live session
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full bg-[#6F7358] text-white hover:bg-[#5F6349]">
              Done
            </Button>
          </Link>
        </div>
      </Shell>
    )
  }

  return null
}

// ─── Small building blocks ──────────────────────────────────

function Shell({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) {
  return (
    <div className="mx-auto w-full max-w-2xl pb-24 text-[#4B3A25] sm:pb-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#F7F0E3] px-3 py-1 text-xs font-medium text-[#8A6A22]">
            <Heart className="size-3.5" />
            Mano Mitra
          </div>
          <p className="mt-1.5 text-xs font-medium text-[#6F7358]">
            {PRODUCT_STEPS}
          </p>
        </div>

        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>
        )}
      </div>

      {children}
    </div>
  )
}

function Question({ text }: { text: string }) {
  return (
    <h2 className="mb-3 font-serif text-xl font-semibold leading-8 text-[#4B3A25]">
      {text}
    </h2>
  )
}

function Choice({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium leading-6 transition-all ${
        selected
          ? "border-[#C89B3C] bg-[#C89B3C]/15 text-[#4B3A25]"
          : "border-[#C89B3C]/25 bg-white/60 text-[#4B3A25] hover:border-[#C89B3C]/60 hover:bg-[#F7F0E3]"
      }`}
    >
      {label}
    </button>
  )
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
        selected
          ? "border-[#C89B3C] bg-[#C89B3C] text-white"
          : "border-[#C89B3C]/30 bg-white/60 text-[#6F7358] hover:border-[#C89B3C]/60"
      }`}
    >
      {label}
    </button>
  )
}

function IntensitySlider({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-medium text-[#6F7358]">Not at all</span>
        <span className="font-serif text-3xl font-semibold tabular-nums text-[#8A6A22]">
          {value}
        </span>
        <span className="text-xs font-medium text-[#6F7358]">As strong as it gets</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Intensity from 0 to 10"
        className="w-full accent-[#C89B3C]"
      />
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-[#6F7358]/20 bg-[#6F7358]/[0.06] p-3 text-xs font-medium leading-5 text-[#6F7358]">
      {children}
    </p>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-center text-xs font-medium text-[#6F7358]">{children}</p>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[#6F7358]">{label}</dt>
      <dd className="text-right font-medium text-[#4B3A25]">{value}</dd>
    </div>
  )
}

function zoneLabel(id: BodyZoneId | null) {
  return BODY_ZONES.find((z) => z.id === id)?.label ?? ""
}

/** Shared end-screen for both the safety stop and the migraine stop. */
function SupportScreen({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl pb-24 text-[#4B3A25] sm:pb-8">
      <div className="rounded-3xl border border-[#B4532A]/35 bg-[#B4532A]/[0.07] p-6">
        <LifeBuoy className="mb-3 size-7 text-[#8E3F1F]" />
        <h2 className="font-serif text-2xl font-semibold text-[#4B3A25]">
          Please reach for support now
        </h2>
        <p className="mt-3 text-base font-medium leading-7 text-[#4B3A25]">
          {message}
        </p>

        <div className="mt-5 space-y-2.5 border-t border-[#B4532A]/25 pt-5">
          {CRISIS_RESOURCES.map((r) => (
            <a
              key={r.name}
              href={`tel:${r.number}`}
              className="flex items-center gap-3 rounded-xl border border-[#B4532A]/25 bg-white/60 p-3 transition-colors hover:bg-white"
            >
              <Phone className="size-4 shrink-0 text-[#8E3F1F]" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#4B3A25]">
                  {r.number} · {r.name}
                </span>
                <span className="block text-xs font-medium text-[#6F7358]">
                  {r.detail}
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>

      <p className="mt-5 text-center text-sm font-medium leading-6 text-[#6F7358]">
        This practice will be here whenever you are ready. It is not a
        substitute for medical or mental-health care.
      </p>

      <Link href="/dashboard" className="mt-5 block">
        <Button variant="outline" className="w-full">
          Back to dashboard
        </Button>
      </Link>
    </div>
  )
}
