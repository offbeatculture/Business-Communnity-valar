import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchAssessmentBySlug, fetchUserResult } from "@/lib/assessment"
import { KOSHA_SCAN_SLUG, asKoshaScoreBlob } from "@/lib/kosha"
import { KOSHA_WEEKS } from "@/lib/panchakosha"
import { VideoCard } from "@/components/panchakosha/VideoCard"
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
    <div className="mx-auto w-full max-w-5xl pb-24 text-[#4B3A25] sm:pb-8">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KOSHA_WEEKS.map((week) => (
          <VideoCard
            key={week.key}
            week={week}
            isPrimary={primary === week.key}
          />
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
