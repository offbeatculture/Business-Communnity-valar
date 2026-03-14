import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const updatePromptSchema = z.object({
  prompt_text: z.string().min(1).max(500).optional(),
  category: z.enum(["reflection", "challenge", "number", "advice", "wins"]).optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_active: z.boolean().optional(),
})

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profile?.role !== "admin") return null
  return user
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await checkAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updatePromptSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: prompt, error } = await admin
      .from("daily_prompts")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A prompt already exists for this date" },
          { status: 409 }
        )
      }
      console.error("Update prompt error:", error)
      return NextResponse.json(
        { error: "Failed to update prompt" },
        { status: 500 }
      )
    }

    return NextResponse.json(prompt)
  } catch (error) {
    console.error("PUT /api/admin/prompts/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await checkAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from("daily_prompts")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Delete prompt error:", error)
      return NextResponse.json(
        { error: "Failed to delete prompt" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/admin/prompts/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    )
  }
}
