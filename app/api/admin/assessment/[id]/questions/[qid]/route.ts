import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const updateQuestionSchema = z.object({
  category: z.string().min(1).optional(),
  question_text: z.string().min(1).max(500).optional(),
  options: z.array(z.object({
    label: z.string().min(1).max(500),
    value: z.string().min(1).max(20),
    score: z.number().min(0).max(10),
  }).strict()).min(2).max(7).optional(),
  sort_order: z.number().optional(),
  is_active: z.boolean().optional(),
})

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
  return profile?.role === "admin" ? user : null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> },
) {
  try {
    const { id, qid } = await params
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const parsed = updateQuestionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("assessment_questions")
      .update(parsed.data)
      .eq("id", qid)
      .eq("assessment_id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    console.error("PATCH question error:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> },
) {
  try {
    const { id, qid } = await params
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const admin = createAdminClient()
    const { error } = await admin.from("assessment_questions").delete().eq("id", qid).eq("assessment_id", id)
    if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE question error:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
