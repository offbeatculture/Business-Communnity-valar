import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { AssessmentForm } from "@/components/admin/AssessmentForm"
import type { Assessment } from "@/types"

export default async function AdminAssessmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  // Get question counts per assessment
  const { data: questionCounts } = await admin
    .from("assessment_questions")
    .select("assessment_id")

  const countMap = new Map<string, number>()
  for (const q of questionCounts ?? []) {
    countMap.set(q.assessment_id, (countMap.get(q.assessment_id) ?? 0) + 1)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Assessments</h1>

      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm font-semibold">Create Assessment</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <AssessmentForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm font-semibold">All Assessments ({(assessments ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {(assessments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessments yet.</p>
          ) : (
            <div className="space-y-3">
              {(assessments as Assessment[]).map((a) => (
                <Link key={a.id} href={`/admin/assessment/${a.id}`}>
                  <div className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{a.title}</p>
                        <Badge variant="outline" className="text-xs">{a.scoring_type}</Badge>
                        {!a.is_published && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        /{a.slug} · {countMap.get(a.id) ?? 0} questions
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
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
