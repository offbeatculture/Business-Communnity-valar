import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchAssessmentBySlug, fetchUserResult } from "@/lib/assessment"
import { KOSHA_SCAN_SLUG, asKoshaScoreBlob } from "@/lib/kosha"
import { KOSHA_WEEKS } from "@/lib/panchakosha"
import { PlayCircle } from "lucide-react"

export const metadata = { title: "Panchakosha Videos" }

export default async function PanchakoshaVideosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // If they have taken the scan, mark their primary layer so the five
  // sessions are not just an undifferentiated list.
  const assessment = await fetchAssessmentBySlug(KOSHA_SCAN_SLUG)
  const result = assessment ? await fetchUserResult(user.id, assessment.id) : null
  const scores = result ? asKoshaScoreBlob(result.scores) : null
  const primary = scores?.primary ?? null

  return (
    <div className="mx-auto w-full max-w-3xl pb-24 text-[#4B3A25] sm:pb-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#F7F0E3] px-3 py-1 text-xs font-medium text-[#8A6A22]">
          <PlayCircle className="size-3.5" />
          Five weeks, five layers
        </div>

        <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
          Panchakosha Videos
        </h1>

        <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#6F7358]">
          One session per kosha. Work through them in order — each layer rests
          on the one before it.
        </p>
      </div>

      <div className="space-y-6">
        {KOSHA_WEEKS.map((week) => (
          <section
            key={week.key}
            className="overflow-hidden rounded-3xl border border-[#C89B3C]/25 bg-[#F7F0E3]"
          >
            {week.videoUrl ? (
              <video
                controls
                // metadata only: five videos on one page is ~230 MB, and
                // preloading them all would burn a member's data before
                // they press play on any of them.
                preload="metadata"
                playsInline
                controlsList="nodownload"
                className="aspect-video w-full bg-black"
              >
                <source src={week.videoUrl} type="video/mp4" />
                Your browser cannot play this video.
              </video>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-[#E8DDC8]/50 px-6 text-center">
                <PlayCircle className="size-9 text-[#C89B3C]" />
                <p className="font-serif text-lg font-semibold">
                  Recording coming soon
                </p>
              </div>
            )}

            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#C89B3C]/15 px-2.5 py-0.5 text-xs font-bold text-[#8A6A22]">
                  Week {week.week}
                </span>

                {primary === week.key && (
                  <span className="rounded-full border border-[#B4532A]/35 bg-[#B4532A]/10 px-2.5 py-0.5 text-xs font-bold text-[#8E3F1F]">
                    Your primary layer
                  </span>
                )}
              </div>

              <h2 className="mt-2 font-serif text-xl font-semibold">
                {week.name}
              </h2>
              <p className="text-sm font-medium text-[#6F7358]">
                {week.sheath}
              </p>

              {week.videoTitle && (
                <p className="mt-2 text-sm font-medium leading-6 text-[#6F7358]">
                  {week.videoTitle}
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      {!primary && (
        <div className="mt-6 rounded-2xl border border-[#C89B3C]/25 bg-white/50 p-4">
          <p className="text-sm font-medium leading-6 text-[#6F7358]">
            Take the Panchakosha Scan and we will mark which of these five
            layers is asking for your attention.{" "}
            <Link href="/assessment" className="font-semibold text-[#8A6A22] underline">
              Start the scan
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
