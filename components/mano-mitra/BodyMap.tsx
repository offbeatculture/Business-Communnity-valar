"use client"

import { useState } from "react"
import { Check, List, RotateCcw } from "lucide-react"
import { BODY_ZONES, type BodyZoneId } from "@/lib/mano-mitra"

type Props = {
  selected: BodyZoneId | null
  onSelect: (zone: BodyZoneId) => void
}

/**
 * Gender-neutral front and back figure, per the spec.
 *
 * Each region IS its own path, so tapping the body part selects it — no
 * invisible hit-boxes drifting out of alignment with the artwork.
 *
 * Front owns everything visible from the front; back owns lower back and
 * hips, which have nowhere sensible to live on a front view.
 */
type Region = { id: BodyZoneId; d: string; label: string }

const FRONT: Region[] = [
  { id: "head", label: "Head or forehead", d: "M74 40 A26 32 0 0 1 126 40 Z" },
  { id: "face", label: "Face, jaw or eyes", d: "M74 40 A26 32 0 0 0 126 40 Z" },
  { id: "throat", label: "Throat or neck", d: "M87 72 h26 v15 h-26 Z" },
  {
    id: "chest",
    label: "Chest or heart area",
    d: "M70 87 Q60 90 59 102 L61 152 L139 152 L141 102 Q140 90 130 87 Z",
  },
  { id: "upper_abdomen", label: "Upper abdomen", d: "M61 152 L139 152 L137 196 L63 196 Z" },
  { id: "lower_abdomen", label: "Lower abdomen or pelvis", d: "M63 196 L137 196 L132 245 L68 245 Z" },
  {
    id: "arms",
    label: "Arms or hands",
    d: "M59 90 L44 99 L39 180 L46 238 L61 240 L56 180 L58 110 Z M141 90 L156 99 L161 180 L154 238 L139 240 L144 180 L142 110 Z",
  },
  {
    id: "legs",
    label: "Thighs, legs or feet",
    d: "M68 245 L65 322 L63 404 L85 406 L89 322 L99 245 Z M101 245 L111 322 L115 406 L137 404 L135 322 L132 245 Z",
  },
]

const BACK: Region[] = [
  // Full ellipse via two large-arc halves — chaining two small arcs
  // back to the start point collapses to an open curve.
  { id: "head", label: "Head or forehead", d: "M100 8 A26 32 0 1 0 100 72 A26 32 0 1 0 100 8 Z" },
  { id: "throat", label: "Throat or neck", d: "M87 72 h26 v15 h-26 Z" },
  { id: "lower_back", label: "Lower back", d: "M61 152 L139 152 L137 205 L63 205 Z" },
  { id: "hips", label: "Hips", d: "M63 205 L137 205 L132 258 L68 258 Z" },
]

/** Drawn but not selectable — context so the figure reads as a body. */
const BACK_INERT = [
  "M70 87 Q60 90 59 102 L61 152 L139 152 L141 102 Q140 90 130 87 Z",
  "M59 90 L44 99 L39 180 L46 238 L61 240 L56 180 L58 110 Z M141 90 L156 99 L161 180 L154 238 L139 240 L144 180 L142 110 Z",
  "M68 258 L65 330 L63 404 L85 406 L89 330 L99 258 Z M101 258 L111 330 L115 406 L137 404 L135 330 L132 258 Z",
]

export function BodyMap({ selected, onSelect }: Props) {
  const [hovered, setHovered] = useState<BodyZoneId | null>(null)
  const [showList, setShowList] = useState(false)
  const [view, setView] = useState<"front" | "back">("front")

  const activeLabel = BODY_ZONES.find((z) => z.id === hovered)?.label ?? null
  const selectedLabel = BODY_ZONES.find((z) => z.id === selected)?.label ?? null

  function renderFigure(regions: Region[], inert: string[], title: string) {
    return (
      <div className="flex flex-1 flex-col items-center">
        <svg
          viewBox="0 0 200 420"
          className="h-auto w-full max-w-[280px] touch-manipulation sm:h-[440px] sm:w-auto sm:max-w-none"
          role="group"
          aria-label={`${title} body view`}
        >
          {inert.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="#E8DDC8"
              stroke="#C89B3C"
              strokeWidth={1}
              strokeOpacity={0.35}
            />
          ))}

          {regions.map((r) => {
            const isSelected = selected === r.id
            const isHovered = hovered === r.id

            return (
              <path
                key={`${title}-${r.id}`}
                d={r.d}
                role="button"
                tabIndex={0}
                aria-label={r.label}
                aria-pressed={isSelected}
                onClick={() => onSelect(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelect(r.id)
                  }
                }}
                // Pointer events, not mouse: these fire for touch too, so a
                // tap paints the region immediately instead of waiting for a
                // synthesised mouseenter. The selection below is what makes
                // it persist once the finger lifts.
                onPointerEnter={() => setHovered(r.id)}
                onPointerLeave={() => setHovered(null)}
                onPointerCancel={() => setHovered(null)}
                onFocus={() => setHovered(r.id)}
                onBlur={() => setHovered(null)}
                fill={
                  isSelected ? "#C89B3C" : isHovered ? "#DFC489" : "#F0E6D2"
                }
                stroke={isSelected ? "#8A6A22" : "#C89B3C"}
                strokeWidth={isSelected ? 2.5 : 1}
                strokeOpacity={isSelected ? 1 : 0.5}
                className="cursor-pointer touch-manipulation outline-none transition-colors focus-visible:stroke-[#4B3A25] focus-visible:stroke-[3]"
              />
            )
          })}
        </svg>
      </div>
    )
  }

  return (
    <div>
      <div className="rounded-3xl border border-[#C89B3C]/25 bg-[#F7F0E3] p-4">
        <div className="mb-3 flex justify-center gap-1 rounded-full border border-[#C89B3C]/25 bg-white/50 p-1">
          {(["front", "back"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                view === v
                  ? "bg-[#C89B3C] text-white"
                  : "text-[#6F7358] hover:bg-[#C89B3C]/10"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          {view === "front"
            ? renderFigure(FRONT, [], "Front")
            : renderFigure(BACK, BACK_INERT, "Back")}
        </div>

        {/* Fixed height so the layout never jumps as the caption changes. */}
        <div className="mt-3 flex min-h-11 items-center justify-center">
          {selected ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#C89B3C] bg-[#C89B3C]/15 px-3.5 py-1.5 text-sm font-semibold text-[#4B3A25]">
              <Check className="size-4 text-[#8A6A22]" />
              {selectedLabel}
            </span>
          ) : (
            <span className="text-sm font-medium text-[#6F7358]">
              {activeLabel ?? "Tap where you notice it"}
            </span>
          )}
        </div>
      </div>

      {/* Neither of these is a place on the body. */}
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {(["whole_body", "cannot_locate"] as BodyZoneId[]).map((id) => {
          const zone = BODY_ZONES.find((z) => z.id === id)!
          const isSelected = selected === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-pressed={isSelected}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
                isSelected
                  ? "border-[#C89B3C] bg-[#C89B3C]/15 text-[#4B3A25]"
                  : "border-[#C89B3C]/25 bg-white/60 text-[#4B3A25] hover:border-[#C89B3C]/60 hover:bg-[#F7F0E3]"
              }`}
            >
              {zone.label}
            </button>
          )
        })}
      </div>

      {/* A silhouette alone is not accessible, and some people simply find
          a list easier than a diagram. Every zone stays reachable as text. */}
      <button
        type="button"
        onClick={() => setShowList((s) => !s)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-[#8A6A22] hover:underline"
      >
        {showList ? <RotateCcw className="size-3.5" /> : <List className="size-3.5" />}
        {showList ? "Use the diagram instead" : "Choose from a list instead"}
      </button>

      {showList && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {BODY_ZONES.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => onSelect(zone.id)}
              aria-pressed={selected === zone.id}
              className={`rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                selected === zone.id
                  ? "border-[#C89B3C] bg-[#C89B3C]/15"
                  : "border-[#C89B3C]/25 bg-white/60 hover:border-[#C89B3C]/60"
              }`}
            >
              {zone.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
