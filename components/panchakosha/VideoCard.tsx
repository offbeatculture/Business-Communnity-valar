"use client"

import { useRef, useState } from "react"
import { Play, Maximize2 } from "lucide-react"
import type { KoshaWeek } from "@/lib/panchakosha"

type Props = {
  week: KoshaWeek
  isPrimary: boolean
}

export function VideoCard({ week, isPrimary }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)

  function play() {
    setStarted(true)
    videoRef.current?.play().catch(() => {
      // Autoplay policy or a codec issue — the native controls are
      // already visible by now, so the member can start it themselves.
    })
  }

  function goFullscreen() {
    const el = videoRef.current
    if (!el) return
    // Safari on iOS exposes only the proprietary form.
    const anyEl = el as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void
    }
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
    else anyEl.webkitEnterFullscreen?.()
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[#C89B3C]/25 bg-[#F7F0E3] transition-shadow hover:shadow-md hover:shadow-black/5">
      <div className="relative aspect-video bg-black">
        {week.videoPath ? (
          <>
            <video
              ref={videoRef}
              // metadata only: five videos on one page is ~230 MB. The
              // #t=0.1 fragment nudges the browser to paint a real frame
              // instead of a black rectangle before playback.
              // The src is an API route that checks access, then 302s to a
              // short-lived signed URL from the private bucket.
              preload="metadata"
              playsInline
              controls={started}
              controlsList="nodownload"
              onPlay={() => setStarted(true)}
              className="size-full"
            >
              <source src={`/api/panchakosha/video/${week.key}#t=0.1`} type="video/mp4" />
              Your browser cannot play this video.
            </video>

            {!started && (
              <button
                type="button"
                onClick={play}
                aria-label={`Play ${week.name} session`}
                className="group absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/35"
              >
                <span className="flex size-14 items-center justify-center rounded-full bg-[#F7F0E3]/95 shadow-lg transition-transform group-hover:scale-105">
                  <Play className="ml-0.5 size-6 fill-[#4B3A25] text-[#4B3A25]" />
                </span>
              </button>
            )}

            {/* Expand is offered before playback too — the native control
                only appears once the player is live. */}
            {!started && (
              <button
                type="button"
                onClick={goFullscreen}
                aria-label={`Expand ${week.name} session`}
                className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-lg bg-black/45 text-white transition-colors hover:bg-black/65"
              >
                <Maximize2 className="size-3.5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-[#E8DDC8]/60 text-center">
            <Play className="size-7 text-[#C89B3C]" />
            <p className="text-xs font-semibold text-[#6F7358]">
              Recording coming
            </p>
          </div>
        )}
      </div>

      <div className="p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-[#C89B3C]/15 px-2 py-0.5 text-[11px] font-bold text-[#8A6A22]">
            Week {week.week}
          </span>
          {isPrimary && (
            <span className="rounded-full border border-[#B4532A]/35 bg-[#B4532A]/10 px-2 py-0.5 text-[11px] font-bold text-[#8E3F1F]">
              Your layer
            </span>
          )}
        </div>

        <h2 className="mt-1.5 font-serif text-base font-semibold leading-tight text-[#4B3A25]">
          {week.name}
        </h2>
        <p className="text-xs font-medium text-[#6F7358]">{week.sheath}</p>

        {week.videoTitle && (
          <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-5 text-[#6F7358]">
            {week.videoTitle}
          </p>
        )}
      </div>
    </article>
  )
}
