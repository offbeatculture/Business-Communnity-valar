import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  fetchAssessmentBySlug,
  fetchQuestions,
  fetchUserResult,
} from "@/lib/assessment"
import { AssessmentWizard } from "@/components/assessment/AssessmentWizard"
import { AssessmentResults } from "@/components/assessment/AssessmentResults"
import { GenericAssessmentResults } from "@/components/assessment/GenericAssessmentResults"
import { KoshaWizard } from "@/components/assessment/KoshaWizard"
import { KoshaResults } from "@/components/assessment/KoshaResults"
import { asKoshaScoreBlob, retakeStatus } from "@/lib/kosha"
import { ClipboardCheck } from "lucide-react"

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ retake?: string }>
}

export default async function AssessmentSlugPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { retake } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const assessment = await fetchAssessmentBySlug(slug)
  if (!assessment) notFound()

  const [questions, result] = await Promise.all([
    fetchQuestions(assessment.id),
    fetchUserResult(user.id, assessment.id),
  ])

  const isKosha = assessment.scoring_type === "kosha"
  const koshaScores = result && isKosha ? asKoshaScoreBlob(result.scores) : null

  // The kosha scan is retakeable once a cycle has elapsed. Members land on
  // their existing results and opt into the reassessment from there.
  const wantsRetake =
    isKosha &&
    retake === "1" &&
    !!result &&
    retakeStatus(result.completed_at).eligible

  if (koshaScores && result && !wantsRetake) {
    return (
      <div className="mx-auto w-full max-w-3xl pb-24 sm:pb-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#F7F0E3] px-3 py-1 text-xs font-medium text-[#8A6A22]">
            <ClipboardCheck className="size-3.5" />
            {result.attempt_number > 1
              ? `Reassessment · Scan ${result.attempt_number}`
              : "Your Panchakosha Scan"}
          </div>

          <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#4B3A25] sm:text-3xl">
            {assessment.title}
          </h1>

          <p className="mt-1 text-sm font-medium text-[#6F7358]">
            Completed on{" "}
            {new Date(result.completed_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <KoshaResults
          scores={koshaScores}
          completedAt={result.completed_at}
          attemptNumber={result.attempt_number}
          hasComparison={result.attempt_number > 1}
        />
      </div>
    )
  }

  if (result && !wantsRetake) {
    return (
      <div className="mx-auto w-full max-w-3xl pb-24 sm:pb-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <ClipboardCheck className="size-3.5" />
            Assessment Result
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {assessment.title}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Completed on{" "}
            {new Date(result.completed_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        {assessment.scoring_type === "scale-code" ? (
          <AssessmentResults result={result} />
        ) : (
          <GenericAssessmentResults result={result} />
        )}
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
          <ClipboardCheck className="size-8 text-muted-foreground" />
        </div>

        <h1 className="text-2xl font-bold">{assessment.title}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          This assessment is being prepared. Check back soon.
        </p>
      </div>
    )
  }

  if (isKosha) {
    return (
      <div className="mx-auto w-full max-w-2xl pb-24 sm:pb-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#F7F0E3] px-3 py-1 text-xs font-medium text-[#8A6A22]">
            <ClipboardCheck className="size-3.5" />
            {wantsRetake ? "Reassessment" : "Panchakosha Scan"}
          </div>

          <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#4B3A25] sm:text-3xl">
            {assessment.title}
          </h1>

          <p className="mt-1 text-sm font-medium text-[#6F7358]">
            {wantsRetake
              ? "Answer the same 30 statements as honestly as you did the first time. We will show you what moved."
              : assessment.description}
          </p>
        </div>

        <KoshaWizard
          questions={questions}
          assessmentSlug={slug}
          isRetake={wantsRetake}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-24 sm:pb-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <ClipboardCheck className="size-3.5" />
          Business Assessment
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {assessment.title}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {assessment.description}
        </p>
      </div>

      <AssessmentWizard questions={questions} assessmentSlug={slug} />
    </div>
  )
}