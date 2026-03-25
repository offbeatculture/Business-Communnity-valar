import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { AssessmentQuestionForm } from "@/components/admin/AssessmentQuestionForm"
import { AssessmentQuestionTable } from "@/components/admin/AssessmentQuestionTable"
import type { Assessment, AssessmentQuestion } from "@/types"

type Props = {
  params: Promise<{ id: string }>
}

export default async function AdminAssessmentDetailPage({ params }: Props) {
  const { id } = await params
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

  const [{ data: assessment }, { data: questions }] = await Promise.all([
    admin.from("assessments").select("*").eq("id", id).single(),
    admin
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", id)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true }),
  ])

  if (!assessment) notFound()

  const typedAssessment = assessment as Assessment

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/assessment"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="size-4" />
          All Assessments
        </Link>
        <h1 className="text-2xl font-bold">{typedAssessment.title}</h1>
        <p className="text-sm text-muted-foreground">/{typedAssessment.slug} · {typedAssessment.scoring_type}</p>
      </div>

      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm font-semibold">Add Question</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <AssessmentQuestionForm assessmentId={id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm font-semibold">Questions ({(questions ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <AssessmentQuestionTable questions={(questions ?? []) as AssessmentQuestion[]} assessmentId={id} />
        </CardContent>
      </Card>
    </div>
  )
}
