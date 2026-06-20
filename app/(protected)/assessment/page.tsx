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
    <div className="mx-auto w-full max-w-5xl pb-24 text-[#4B3A25] sm:pb-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#F7F0E3] px-3 py-1 text-xs font-medium text-[#8A6A22]">
          <ClipboardCheck className="size-3.5" />
          Daily Breathwork Check-in
        </div>

        <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#4B3A25] sm:text-4xl">
          Self Check-ins
        </h1>

        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#6F7358]">
          Reflect on your breathwork consistency, emotional balance, nervous
          system state, and daily wellbeing.
        </p>
      </div>

      {assessments.length === 0 ? (
        <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-3xl border border-dashed border-[#C89B3C]/30 bg-[#F7F0E3]/80 px-6 py-12 text-center text-[#4B3A25]">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#C89B3C]/10">
            <ClipboardCheck className="size-8 text-[#C89B3C]" />
          </div>

          <h3 className="font-serif text-xl font-semibold text-[#4B3A25]">
            No check-ins available
          </h3>

          <p className="mt-2 max-w-xs text-sm font-medium leading-6 text-[#6F7358]">
            New self check-ins will appear here when they are published.
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