import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { PROMPT_CATEGORIES } from "@/lib/prompts"

const createPromptSchema = z.object({
  title: z.string().min(1).max(200),
  prompt_text: z.string().min(1).max(5000),
  category: z.enum(PROMPT_CATEGORIES),
  linked_content_id: z.string().uuid().nullable().optional(),
  linked_content_type: z.enum(["resource", "video_summary"]).nullable().optional(),
  is_published: z.boolean().default(true),
})

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  return profile?.role === "admin" ? user : null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("prompt_library")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Fetch prompt library error:", error)
      return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/admin/prompts-library error:", error)
    return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const parsed = createPromptSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("prompt_library")
      .insert(parsed.data)
      .select()
      .single()

    if (error) {
      console.error("Create prompt error:", error)
      return NextResponse.json({ error: "Failed to create prompt" }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("POST /api/admin/prompts-library error:", error)
    return NextResponse.json({ error: "Failed to create prompt" }, { status: 500 })
  }
}
