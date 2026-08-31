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

/**
 * The member's most recent attempt. Results are now append-only history
 * (see 20260830_kosha_scan.sql), so "latest" is the highest attempt_number
 * rather than the only row.
 */
export async function fetchUserResult(userId: string, assessmentId: string): Promise<AssessmentResult | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as AssessmentResult | null
}

/** Every attempt, oldest first — attempt 1 is the intake baseline. */
export async function fetchUserAttempts(
  userId: string,
  assessmentId: string
): Promise<AssessmentResult[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .order("attempt_number", { ascending: true })

  return (data ?? []) as AssessmentResult[]
}

/** Latest attempt per assessment, for the assessment index page. */
export async function fetchUserResults(userId: string): Promise<AssessmentResult[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("user_id", userId)
    .order("attempt_number", { ascending: false })

  const rows = (data ?? []) as AssessmentResult[]

  // Rows arrive newest-attempt-first, so the first hit per assessment wins.
  const latest = new Map<string, AssessmentResult>()
  for (const row of rows) {
    if (!latest.has(row.assessment_id)) latest.set(row.assessment_id, row)
  }

  return [...latest.values()]
}

export async function hasCompletedAssessment(userId: string, slug: string): Promise<boolean> {
  const supabase = await createClient()

  // limit(1): a member may now have several attempts on the same slug.
  const { data } = await supabase
    .from("assessment_results")
    .select("id, assessments!inner(slug)")
    .eq("user_id", userId)
    .eq("assessments.slug", slug)
    .limit(1)
    .maybeSingle()

  return !!data
}
