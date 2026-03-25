import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchAssessmentBySlug, fetchQuestions, fetchUserResult } from "@/lib/assessment"
import { AssessmentWizard } from "@/components/assessment/AssessmentWizard"
import { AssessmentResults } from "@/components/assessment/AssessmentResults"
import { GenericAssessmentResults } from "@/components/assessment/GenericAssessmentResults"

type Props = {
  params: Promise<{ slug: string }>
}

export default async function AssessmentSlugPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const assessment = await fetchAssessmentBySlug(slug)
  if (!assessment) notFound()

  const [questions, result] = await Promise.all([
    fetchQuestions(assessment.id),
    fetchUserResult(user.id, assessment.id),
  ])

  // Already completed — show results
  if (result) {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">{assessment.title}</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Completed on {new Date(result.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        {assessment.scoring_type === "scale-code" ? (
          <AssessmentResults result={result} />
        ) : (
          <GenericAssessmentResults result={result} />
        )}
      </div>
    )
  }

  // No questions
  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold mb-2">{assessment.title}</h1>
        <p className="text-muted-foreground">This assessment is being prepared. Check back soon!</p>
      </div>
    )
  }

  // Show wizard
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">{assessment.title}</h1>
      <p className="text-muted-foreground text-sm mb-6">{assessment.description}</p>
      <AssessmentWizard questions={questions} assessmentSlug={slug} />
    </div>
  )
}
