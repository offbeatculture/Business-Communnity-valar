import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const createQuestionSchema = z.object({
  category: z.string().min(1),
  question_text: z.string().min(1).max(500),
  options: z.array(z.object({
    label: z.string().min(1).max(500),
    value: z.string().min(1).max(20),
    score: z.number().min(0).max(10),
  }).strict()).min(2).max(7),
  sort_order: z.number().default(0),
  is_active: z.boolean().default(true),
})

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
  return profile?.role === "admin" ? user : null
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", id)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })

    if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    console.error("GET questions error:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const parsed = createQuestionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("assessment_questions")
      .insert({ ...parsed.data, assessment_id: id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: "Failed to create" }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("POST question error:", error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}
