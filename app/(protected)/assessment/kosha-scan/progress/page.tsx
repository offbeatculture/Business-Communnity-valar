import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchAssessmentBySlug, fetchUserAttempts } from "@/lib/assessment"
import { KoshaComparison } from "@/components/assessment/KoshaComparison"
import { Button } from "@/components/ui/button"
import {
  KOSHA_SCAN_SLUG,
  asKoshaScoreBlob,
  compareAttempts,
} from "@/lib/kosha"
import { ArrowRight, TrendingDown } from "lucide-react"

export default async function KoshaProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const assessment = await fetchAssessmentBySlug(KOSHA_SCAN_SLUG)
  if (!assessment) notFound()

  const attempts = await fetchUserAttempts(user.id, assessment.id)

  // Compare the intake baseline against the most recent scan — that pairing
  // is what the renewal conversation is built on.
  const scored = attempts
    .map((a) => ({ attempt: a, scores: asKoshaScoreBlob(a.scores) }))
    .filter((a): a is { attempt: (typeof attempts)[number]; scores: NonNullable<ReturnType<typeof asKoshaScoreBlob>> } =>
      a.scores !== null
    )

  if (scored.length < 2) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center text-[#4B3A25]">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#C89B3C]/10">
          <TrendingDown className="size-8 text-[#C89B3C]" />
        </div>

        <h1 className="font-serif text-2xl font-semibold">
          Nothing to compare yet
        </h1>

        <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-[#6F7358]">
          Your progress view opens once you have taken the Panchakosha Scan a
          second time, at the end of your cycle.
        </p>

        <Link href="/assessment/kosha-scan" className="mt-5">
          <Button className="bg-[#C89B3C] text-white hover:bg-[#B4882F]">
            Back to your scan
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </Link>
      </div>
    )
  }

  const first = scored[0]
  const latest = scored[scored.length - 1]
  const comparison = compareAttempts(first.scores, latest.scores)

  return (
    <div className="mx-auto w-full max-w-3xl pb-24 sm:pb-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#F7F0E3] px-3 py-1 text-xs font-medium text-[#8A6A22]">
          <TrendingDown className="size-3.5" />
          Before &amp; after
        </div>

        <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#4B3A25] sm:text-3xl">
          What actually moved
        </h1>

        <p className="mt-1 text-sm font-medium text-[#6F7358]">
          Your intake scan compared against your most recent one.
        </p>
      </div>

      <KoshaComparison
        comparison={comparison}
        beforeDate={first.attempt.completed_at}
        afterDate={latest.attempt.completed_at}
        attempts={latest.attempt.attempt_number}
      />
    </div>
  )
}
