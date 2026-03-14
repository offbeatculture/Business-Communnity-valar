import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: existing } = await supabase
      .from("saved_posts")
      .select("id")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "Already saved" }, { status: 409 })
    }

    const { error } = await supabase
      .from("saved_posts")
      .insert({ post_id: id, user_id: user.id })

    if (error) {
      console.error("Save post error:", error)
      return NextResponse.json(
        { error: "Failed to save post" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/posts/[id]/save error:", error)
    return NextResponse.json(
      { error: "Failed to save post" },
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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("saved_posts")
      .delete()
      .eq("post_id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Unsave post error:", error)
      return NextResponse.json(
        { error: "Failed to unsave post" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/posts/[id]/save error:", error)
    return NextResponse.json(
      { error: "Failed to unsave post" },
      { status: 500 }
    )
  }
}
