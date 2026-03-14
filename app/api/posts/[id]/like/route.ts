import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { awardPoints } from "@/lib/engagement"
import { GP_VALUES } from "@/lib/engagement-constants"

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

    // Check if already liked
    const { data: existing } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "Already liked" }, { status: 409 })
    }

    const { error: likeError } = await supabase
      .from("likes")
      .insert({ post_id: id, user_id: user.id })

    if (likeError) {
      console.error("Like insert error:", likeError)
      return NextResponse.json(
        { error: "Failed to like post" },
        { status: 500 }
      )
    }

    // Increment like_count via admin client
    const admin = createAdminClient()
    const { data: post } = await admin
      .from("posts")
      .select("like_count, user_id")
      .eq("id", id)
      .single()

    if (post) {
      await admin
        .from("posts")
        .update({ like_count: post.like_count + 1 })
        .eq("id", id)

      // Award GP to liker
      awardPoints(user.id, "like_given", GP_VALUES.like_given, id).catch(() => {})

      // Award GP to post author for receiving a like (if not self-liking)
      if (post.user_id !== user.id) {
        awardPoints(post.user_id, "like_received", GP_VALUES.like_received, id).catch(() => {})
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/posts/[id]/like error:", error)
    return NextResponse.json(
      { error: "Failed to like post" },
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

    const { error: unlikeError } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", id)
      .eq("user_id", user.id)

    if (unlikeError) {
      console.error("Unlike error:", unlikeError)
      return NextResponse.json(
        { error: "Failed to unlike post" },
        { status: 500 }
      )
    }

    // Decrement like_count via admin client (floor at 0)
    const admin = createAdminClient()
    const { data: post } = await admin
      .from("posts")
      .select("like_count")
      .eq("id", id)
      .single()

    if (post) {
      await admin
        .from("posts")
        .update({ like_count: Math.max(0, post.like_count - 1) })
        .eq("id", id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/posts/[id]/like error:", error)
    return NextResponse.json(
      { error: "Failed to unlike post" },
      { status: 500 }
    )
  }
}
