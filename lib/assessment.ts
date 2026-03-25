import { createClient } from "@/lib/supabase/server"
import type { Assessment, AssessmentQuestion, AssessmentResult } from "@/types"

export const SCALE_CODE_SLUG = "scale-code"

export async function fetchAssessments(): Promise<Assessment[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("assessments")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: true })

  return (data ?? []) as Assessment[]
}

export async function fetchAssessmentBySlug(slug: string): Promise<Assessment | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("assessments")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle()

  return data as Assessment | null
}

export async function fetchQuestions(assessmentId: string): Promise<AssessmentQuestion[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("assessment_questions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  return (data ?? []) as AssessmentQuestion[]
}

export async function fetchUserResult(userId: string, assessmentId: string): Promise<AssessmentResult | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .maybeSingle()

  return data as AssessmentResult | null
}

export async function fetchUserResults(userId: string): Promise<AssessmentResult[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("user_id", userId)

  return (data ?? []) as AssessmentResult[]
}

export async function hasCompletedAssessment(userId: string, slug: string): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("assessment_results")
    .select("id, assessments!inner(slug)")
    .eq("user_id", userId)
    .eq("assessments.slug", slug)
    .maybeSingle()

  return !!data
}
