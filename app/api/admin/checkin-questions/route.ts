import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const createSchema = z.object({
  question_text: z.string().min(1).max(300),
  // null = the standing set shown every day; 1–5 = that kosha week only.
  week_number: z.number().int().min(1).max(5).nullable().optional(),
  sort_order: z.number().int().min(0).max(99).optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  question_text: z.string().min(1).max(300).optional(),
  week_number: z.number().int().min(1).max(5).nullable().optional(),
  sort_order: z.number().int().min(0).max(99).optional(),
  is_active: z.boolean().optional(),
})

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { user }
}

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("checkin_questions")
    .select("*")
    .order("week_number", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("Fetch checkin questions error:", error)
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("checkin_questions")
    .insert({
      question_text: parsed.data.question_text,
      week_number: parsed.data.week_number ?? null,
      sort_order: parsed.data.sort_order ?? 99,
    })
    .select()
    .single()

  if (error) {
    console.error("Create checkin question error:", error)
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { id, ...fields } = parsed.data

  // Editing the text of a live question silently rewrites history: past
  // check-ins store answers keyed by question id, so yesterday's "yes"
  // would suddenly read as a yes to the NEW wording. Deactivate and add
  // a replacement instead of rewording something already answered.
  if (fields.question_text !== undefined) {
    const admin = createAdminClient()
    const { count } = await admin
      .from("daily_checkins")
      .select("id", { count: "exact", head: true })
      .contains("answers", { [id]: true })

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "This question has already been answered by members. Deactivate it and add a new one instead, so past check-ins keep their meaning.",
        },
        { status: 409 },
      )
    }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("checkin_questions")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Update checkin question error:", error)
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 })
  }

  return NextResponse.json(data)
}
