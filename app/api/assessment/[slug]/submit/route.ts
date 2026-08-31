import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { awardPoints } from "@/lib/engagement"
import { GP_VALUES } from "@/lib/engagement-constants"
import { calculateScaleCode, PILLAR_KEYS, type PillarScores } from "@/lib/scale-code"
import {
  buildScoreBlob,
  emptyScores,
  isKoshaKey,
  scoreAnswer,
  retakeStatus,
  MAX_PER_KOSHA,
  KOSHA_KEYS,
} from "@/lib/kosha"
import type { Assessment, AssessmentQuestion } from "@/types"

const submitSchema = z.object({
  answers: z.record(z.string(), z.string()),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Look up assessment
    const admin = createAdminClient()
    const { data: assessment } = await admin
      .from("assessments")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single()

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
    }

    const typedAssessment = assessment as Assessment

    // Most recent attempt, if any.
    const { data: existing } = await admin
      .from("assessment_results")
      .select("id, attempt_number, completed_at")
      .eq("user_id", user.id)
      .eq("assessment_id", typedAssessment.id)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle()

    const isKosha = typedAssessment.scoring_type === "kosha"

    if (existing) {
      // Non-kosha assessments stay single-shot, exactly as before.
      if (!isKosha) {
        return NextResponse.json({ error: "Assessment already completed" }, { status: 409 })
      }

      // The kosha scan is retakeable, but gated to the end of a cycle so
      // the before/after comparison stays meaningful. Admins bypass it.
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle()

      const isAdmin = profile?.role === "admin"
      const status = retakeStatus(existing.completed_at as string)

      if (!isAdmin && !status.eligible) {
        return NextResponse.json(
          {
            error: `You can retake the scan in ${status.daysRemaining} day${status.daysRemaining === 1 ? "" : "s"}.`,
            retakeAvailableOn: status.availableOn.toISOString(),
          },
          { status: 409 },
        )
      }
    }

    const attemptNumber = ((existing?.attempt_number as number | undefined) ?? 0) + 1

    const body = await request.json()
    const parsed = submitSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })
    }

    // Fetch questions
    const { data: questions } = await admin
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", typedAssessment.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "No questions available" }, { status: 400 })
    }

    const typedQuestions = questions as AssessmentQuestion[]
    const { answers } = parsed.data

    let scores: unknown
    let totalScore: number
    let maxPossibleScore: number

    if (typedAssessment.scoring_type === "scale-code") {
      // Scale Code scoring
      const pillarQuestions = typedQuestions.filter((q) => q.category !== "revenue")
      const revenueQuestion = typedQuestions.find((q) => q.category === "revenue")

      const pillarTotals: Record<string, { sum: number; count: number }> = {}
      for (const q of pillarQuestions) {
        const selectedValue = answers[q.id]
        if (!selectedValue) continue
        const option = q.options.find((o) => o.value === selectedValue)
        if (!option) continue
        if (!pillarTotals[q.category]) pillarTotals[q.category] = { sum: 0, count: 0 }
        pillarTotals[q.category].sum += option.score
        pillarTotals[q.category].count += 1
      }

      const pillarScores: PillarScores = {} as PillarScores
      for (const key of PILLAR_KEYS) {
        const data = pillarTotals[key]
        pillarScores[key] = data && data.count > 0 ? Math.round((data.sum / data.count) * 2) : 0
      }

      let stageIndex = 0
      if (revenueQuestion) {
        const opt = revenueQuestion.options.find((o) => o.value === answers[revenueQuestion.id])
        if (opt) stageIndex = opt.score
      }

      scores = calculateScaleCode(pillarScores, stageIndex)
      totalScore = PILLAR_KEYS.reduce((sum, k) => sum + pillarScores[k], 0)
      maxPossibleScore = PILLAR_KEYS.length * 10
    } else if (isKosha) {
      // Panchakosha: sum each layer's 6 answers to a score out of 30,
      // applying that layer's polarity (see lib/kosha.ts REVERSE-SCORING).
      const koshaScores = emptyScores()

      for (const q of typedQuestions) {
        if (!isKoshaKey(q.category)) continue

        const selectedValue = answers[q.id]
        if (!selectedValue) continue

        const option = q.options.find((o) => o.value === selectedValue)
        if (!option) continue

        koshaScores[q.category] += scoreAnswer(q.category, option.score)
      }

      scores = buildScoreBlob(koshaScores)
      totalScore = KOSHA_KEYS.reduce((sum, k) => sum + koshaScores[k], 0)
      maxPossibleScore = KOSHA_KEYS.length * MAX_PER_KOSHA
    } else {
      // Generic scoring: simple sum per category
      const categoryScores: Record<string, number> = {}
      const categoryMax: Record<string, number> = {}
      totalScore = 0
      maxPossibleScore = 0

      for (const q of typedQuestions) {
        const selectedValue = answers[q.id]
        const maxOptionScore = Math.max(...q.options.map((o) => o.score))
        categoryMax[q.category] = (categoryMax[q.category] ?? 0) + maxOptionScore
        maxPossibleScore += maxOptionScore

        if (selectedValue) {
          const option = q.options.find((o) => o.value === selectedValue)
          if (option) {
            categoryScores[q.category] = (categoryScores[q.category] ?? 0) + option.score
            totalScore += option.score
          }
        }
      }

      scores = { categories: categoryScores, maxPerCategory: categoryMax }
    }

    // Save result
    const { data: result, error } = await admin
      .from("assessment_results")
      .insert({
        user_id: user.id,
        assessment_id: typedAssessment.id,
        answers,
        scores,
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        attempt_number: attemptNumber,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Save assessment result error:", error)
      return NextResponse.json({ error: "Failed to save result" }, { status: 500 })
    }

    await awardPoints(user.id, "assessment_complete", GP_VALUES.assessment_complete)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("POST /api/assessment/[slug]/submit error:", error)
    return NextResponse.json({ error: "Failed to submit assessment" }, { status: 500 })
  }
}
