import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { KOSHA_WEEKS, koshaWeekByKey } from "@/lib/panchakosha"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Clock, PlayCircle, Sparkles } from "lucide-react"

type Props = { params: Promise<{ kosha: string }> }

export async function generateMetadata({ params }: Props) {
  const { kosha } = await params
  const week = koshaWeekByKey(kosha)
  return { title: week ? `${week.name} — Week ${week.week}` : "Panchakosha" }
}

export default async function KoshaVideoPage({ params }: Props) {
  const { kosha } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const week = koshaWeekByKey(kosha)
  if (!week) notFound()

  const index = KOSHA_WEEKS.findIndex((w) => w.key === week.key)
  const prev = index > 0 ? KOSHA_WEEKS[index - 1] : null
  const next = index < KOSHA_WEEKS.length - 1 ? KOSHA_WEEKS[index + 1] : null

  return (
    <div className="mx-auto w-full max-w-3xl pb-24 text-[#4B3A25] sm:pb-8">
      <Link
        href="/panchakosha/videos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#6F7358] hover:text-[#4B3A25]"
      >
        <ArrowLeft className="size-4" />
        All five layers
      </Link>

      <div className="mb-5">
        <span className="rounded-full bg-[#C89B3C]/15 px-2.5 py-0.5 text-xs font-bold text-[#8A6A22]">
          Week {week.week} of {KOSHA_WEEKS.length}
        </span>

        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
          {week.name}
        </h1>
        <p className="text-sm font-medium text-[#6F7358]">{week.sheath}</p>
        <p className="mt-2 text-sm font-medium leading-6 text-[#6F7358]">
          {week.summary}
        </p>
      </div>

      {/* Video */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-[#C89B3C]/25 bg-[#F7F0E3]">
        {week.videoUrl ? (
          <div className="aspect-video">
            <iframe
              src={week.videoUrl}
              title={`${week.name} — ${week.durationMinutes} minute session`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="size-full"
            />
          </div>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-[#E8DDC8]/50 px-6 text-center">
            <PlayCircle className="size-9 text-[#C89B3C]" />
            <p className="font-serif text-lg font-semibold">
              Recording coming soon
            </p>
            <p className="max-w-sm text-sm font-medium leading-6 text-[#6F7358]">
              The {week.durationMinutes}-minute session for this layer is being
              produced. Everything below is what it covers — you can begin the
              practices now.
            </p>
          </div>
        )}
      </div>

      {/* What the session covers */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold">
          <Clock className="size-4 text-[#C89B3C]" />
          What this session covers
        </h2>

        <ul className="space-y-2.5 rounded-2xl border border-[#C89B3C]/20 bg-white/50 p-4">
          {week.teaches.map((point, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#C89B3C]" />
              <span className="text-sm font-medium leading-6">{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Practice moment */}
      <section className="mb-6">
        <div className="rounded-2xl border border-[#6F7358]/25 bg-[#6F7358]/[0.07] p-4">
          <h2 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#59603F]">
            <Sparkles className="size-3.5" />
            Practice together
          </h2>
          <p className="text-sm font-medium leading-6 text-[#4B3A25]">
            {week.practice}
          </p>
        </div>
      </section>

      {/* The ten activities */}
      <section>
        <h2 className="mb-1 font-serif text-lg font-semibold">
          This week&apos;s {week.activities.length} practices
        </h2>
        <p className="mb-3 text-sm font-medium text-[#6F7358]">
          Carry these through the week alongside your daily check-in.
        </p>

        <ol className="space-y-2">
          {week.activities.map((activity, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-2xl border border-[#C89B3C]/20 bg-white/50 p-3.5"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#C89B3C]/15 text-xs font-bold tabular-nums text-[#8A6A22]">
                {i + 1}
              </span>
              <span className="text-sm font-medium leading-6">{activity}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Week nav */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        {prev ? (
          <Link href={`/panchakosha/videos/${prev.key}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-1 size-4" />
              Week {prev.week}
            </Button>
          </Link>
        ) : (
          <span />
        )}

        {next && (
          <Link href={`/panchakosha/videos/${next.key}`}>
            <Button className="bg-[#C89B3C] text-white hover:bg-[#B4882F]">
              Week {next.week} · {next.name}
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
