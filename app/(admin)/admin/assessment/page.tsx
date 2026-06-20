import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"
import { AssessmentForm } from "@/components/admin/AssessmentForm"
import type { Assessment } from "@/types"

export default async function AdminAssessmentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/dashboard")

  const admin = createAdminClient()

  const { data: assessments } = await admin
    .from("assessments")
    .select("*")
    .order("created_at", { ascending: true })

  const { data: questionCounts } = await admin
    .from("assessment_questions")
    .select("assessment_id")

  const countMap = new Map<string, number>()

  for (const q of questionCounts ?? []) {
    countMap.set(q.assessment_id, (countMap.get(q.assessment_id) ?? 0) + 1)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-[#4B3A25]">
      <div>
        <p className="text-sm font-medium text-[#8A6A22]">
          Daily Breathwork Admin
        </p>

        <h1 className="font-serif text-3xl font-semibold text-[#4B3A25]">
          Wellbeing Check-ins
        </h1>

        <p className="mt-1 text-sm text-[#6F7358]">
          Create and manage breathwork assessments for the Valarmathi community.
        </p>
      </div>

      <Card className="border-[#C89B3C]/20 bg-[#F7F0E3] text-[#4B3A25] shadow-sm shadow-black/5">
        <CardHeader className="px-4 pb-3 pt-4">
          <CardTitle className="font-serif text-lg font-semibold">
            Create Check-in
          </CardTitle>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          <AssessmentForm />
        </CardContent>
      </Card>

      <Card className="border-[#C89B3C]/20 bg-[#F7F0E3] text-[#4B3A25] shadow-sm shadow-black/5">
        <CardHeader className="px-4 pb-3 pt-4">
          <CardTitle className="font-serif text-lg font-semibold">
            All Check-ins ({(assessments ?? []).length})
          </CardTitle>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          {(assessments ?? []).length === 0 ? (
            <p className="text-sm text-[#6F7358]">No check-ins yet.</p>
          ) : (
            <div className="space-y-3">
              {(assessments as Assessment[]).map((a) => (
                <Link key={a.id} href={`/admin/assessment/${a.id}`}>
                  <div className="flex items-center justify-between rounded-lg border border-[#C89B3C]/20 bg-[#E8DDC8]/45 p-3 transition-colors hover:bg-[#E8DDC8]">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#4B3A25]">
                          {a.title}
                        </p>

                        <Badge
                          variant="outline"
                          className="border-[#C89B3C]/30 text-xs text-[#8A6A22]"
                        >
                          {a.scoring_type}
                        </Badge>

                        {!a.is_published && (
                          <Badge
                            variant="secondary"
                            className="bg-[#C89B3C]/10 text-xs text-[#8A6A22]"
                          >
                            Draft
                          </Badge>
                        )}
                      </div>

                      <p className="mt-0.5 text-xs text-[#6F7358]">
                        /{a.slug} · {countMap.get(a.id) ?? 0} questions
                      </p>
                    </div>

                    <ArrowRight className="size-4 text-[#8A6A22]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}