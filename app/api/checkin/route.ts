import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import {
  fetchCheckinQuestions,
  fetchTodayCheckin,
  submitCheckin,
} from "@/lib/checkin-server"

const submitSchema = z.object({
  answers: z.record(z.string(), z.boolean()),
})

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [questions, today] = await Promise.all([
    fetchCheckinQuestions(),
    fetchTodayCheckin(user.id),
  ])

  return NextResponse.json({ questions, today })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parsed = submitSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      )
    }

    // Only accept answers to questions that are actually live today.
    // Without this a client could post arbitrary keys and inflate
    // yes_count — and therefore the leaderboard.
    const questions = await fetchCheckinQuestions()
    const liveIds = new Set(questions.map((q) => q.id))

    const answers: Record<string, boolean> = {}
    for (const [id, value] of Object.entries(parsed.data.answers)) {
      if (liveIds.has(id)) answers[id] = value
    }

    if (Object.keys(answers).length !== questions.length) {
      return NextResponse.json(
        { error: "Please answer every question" },
        { status: 400 },
      )
    }

    const result = await submitCheckin(user.id, answers)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("POST /api/checkin error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save check-in" },
      { status: 500 },
    )
  }
}
