import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const createAssessmentSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).default(""),
  scoring_type: z.enum(["scale-code", "generic"]).default("generic"),
  is_published: z.boolean().default(true),
})

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()
  return profile?.role === "admin" ? user : null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: true })

    if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/admin/assessment error:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const parsed = createAssessmentSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin.from("assessments").insert(parsed.data).select().single()

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
      return NextResponse.json({ error: "Failed to create" }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("POST /api/admin/assessment error:", error)
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}
