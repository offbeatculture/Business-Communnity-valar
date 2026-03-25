import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchAssessments, fetchUserResults } from "@/lib/assessment"
import { AssessmentCard } from "@/components/assessment/AssessmentCard"

export default async function AssessmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [assessments, results] = await Promise.all([
    fetchAssessments(),
    fetchUserResults(user.id),
  ])

  const resultMap = new Map(results.map((r) => [r.assessment_id, r]))

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Assessments</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Take an assessment to diagnose your business and get personalized recommendations.
      </p>

      {assessments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No assessments available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
