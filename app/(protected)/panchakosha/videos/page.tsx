import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchAssessmentBySlug, fetchUserResult } from "@/lib/assessment"
import { KOSHA_SCAN_SLUG, asKoshaScoreBlob } from "@/lib/kosha"
import { KOSHA_WEEKS } from "@/lib/panchakosha"
import { ArrowRight, PlayCircle, Clock, ListChecks } from "lucide-react"

export const metadata = { title: "Panchakosha Videos" }

export default async function PanchakoshaVideosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // If they have taken the scan, mark their primary layer so the five
  // weeks are not just an undifferentiated list.
  const assessment = await fetchAssessmentBySlug(KOSHA_SCAN_SLUG)
  const result = assessment ? await fetchUserResult(user.id, assessment.id) : null
  const scores = result ? asKoshaScoreBlob(result.scores) : null
  const primary = scores?.primary ?? null

  return (
    <div className="mx-auto w-full max-w-4xl pb-24 text-[#4B3A25] sm:pb-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#F7F0E3] px-3 py-1 text-xs font-medium text-[#8A6A22]">
          <PlayCircle className="size-3.5" />
          Five weeks, five layers
        </div>

        <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
          Panchakosha Videos
        </h1>

        <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#6F7358]">
          One ten-minute session per kosha, with ten practices to carry through
          that week. Work through them in order — each layer rests on the one
          before it.
        </p>
      </div>

      <div className="space-y-3.5">
        {KOSHA_WEEKS.map((week) => {
          const isPrimary = primary === week.key

          return (
            <Link
              key={week.key}
              href={`/panchakosha/videos/${week.key}`}
              className="group block rounded-3xl border border-[#C89B3C]/25 bg-[#F7F0E3] p-5 transition-all hover:border-[#C89B3C]/60 hover:shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#C89B3C]/15 px-2.5 py-0.5 text-xs font-bold text-[#8A6A22]">
                      Week {week.week}
                    </span>

                    {isPrimary && (
                      <span className="rounded-full border border-[#B4532A]/35 bg-[#B4532A]/10 px-2.5 py-0.5 text-xs font-bold text-[#8E3F1F]">
                        Your primary layer
                      </span>
                    )}

                    {!week.videoUrl && (
                      <span className="rounded-full border border-[#6F7358]/25 bg-[#6F7358]/10 px-2.5 py-0.5 text-xs font-medium text-[#59603F]">
                        Recording coming
                      </span>
                    )}
                  </div>

                  <h2 className="mt-2 font-serif text-xl font-semibold">
                    {week.name}
                  </h2>
                  <p className="text-sm font-medium text-[#6F7358]">
                    {week.sheath}
                  </p>

                  <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[#6F7358]">
                    {week.summary}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-[#6F7358]">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {week.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ListChecks className="size-3.5" />
                      {week.activities.length} practices
                    </span>
                  </div>
                </div>

                <ArrowRight className="mt-1 size-5 shrink-0 text-[#C89B3C] transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          )
        })}
      </div>

      {!primary && (
        <div className="mt-6 rounded-2xl border border-[#C89B3C]/25 bg-white/50 p-4">
          <p className="text-sm font-medium leading-6 text-[#6F7358]">
            Take the Panchakosha Scan first and we will mark which of these five
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
