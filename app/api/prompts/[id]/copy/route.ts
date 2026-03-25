import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify prompt exists and is published before incrementing
    const { data: prompt } = await supabase
      .from("prompt_library")
      .select("id")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { error } = await admin.rpc("increment_prompt_copy_count", { prompt_id: id })

    if (error) {
      console.error("Increment copy count error:", error)
      return NextResponse.json({ error: "Failed to track copy" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/prompts/[id]/copy error:", error)
    return NextResponse.json({ error: "Failed to track copy" }, { status: 500 })
  }
}
