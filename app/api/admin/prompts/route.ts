import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const createPromptSchema = z.object({
  prompt_text: z.string().min(1).max(500),
  category: z.enum(["reflection", "challenge", "number", "advice", "wins"]),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: prompts, error } = await admin
      .from("daily_prompts")
      .select("*")
      .order("scheduled_date", { ascending: false })

    if (error) {
      console.error("Fetch prompts error:", error)
      return NextResponse.json(
        { error: "Failed to fetch prompts" },
        { status: 500 }
      )
    }

    return NextResponse.json(prompts)
  } catch (error) {
    console.error("GET /api/admin/prompts error:", error)
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createPromptSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: prompt, error } = await admin
      .from("daily_prompts")
      .insert({
        prompt_text: parsed.data.prompt_text,
        category: parsed.data.category,
        scheduled_date: parsed.data.scheduled_date,
        created_by: user.id,
      })
      .select("*")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A prompt already exists for this date" },
          { status: 409 }
        )
      }
      console.error("Create prompt error:", error)
      return NextResponse.json(
        { error: "Failed to create prompt" },
        { status: 500 }
      )
    }

    return NextResponse.json(prompt, { status: 201 })
  } catch (error) {
    console.error("POST /api/admin/prompts error:", error)
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    )
  }
}
