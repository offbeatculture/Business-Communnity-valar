import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchAssessments, fetchUserResults } from "@/lib/assessment"
import { AssessmentCard } from "@/components/assessment/AssessmentCard"
import { ClipboardCheck } from "lucide-react"

export default async function AssessmentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [assessments, results] = await Promise.all([
    fetchAssessments(),
    fetchUserResults(user.id),
  ])

  const resultMap = new Map(results.map((r) => [r.assessment_id, r]))

  return (
    <div className="mx-auto w-full max-w-5xl pb-24 sm:pb-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <ClipboardCheck className="size-3.5" />
          Business Diagnosis
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Assessments
        </h1>

        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Diagnose your business, find your weakest growth areas, and get clear
          next actions.
        </p>
      </div>

      {assessments.length === 0 ? (
        <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-12 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
            <ClipboardCheck className="size-8 text-muted-foreground" />
          </div>

          <h3 className="text-lg font-semibold">No assessments available</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            New assessments will appear here when they are published.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              result={resultMap.get(assessment.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}