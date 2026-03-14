import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: postId, commentId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()

    // Check comment exists
    const { data: comment } = await admin
      .from("comments")
      .select("user_id")
      .eq("id", commentId)
      .single()

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    // Check ownership or admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (comment.user_id !== user.id && profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await admin
      .from("comments")
      .delete()
      .eq("id", commentId)

    if (error) {
      console.error("Delete comment error:", error)
      return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500 }
      )
    }

    // Decrement comment_count (floor at 0)
    const { data: post } = await admin
      .from("posts")
      .select("comment_count")
      .eq("id", postId)
      .single()

    if (post) {
      await admin
        .from("posts")
        .update({ comment_count: Math.max(0, post.comment_count - 1) })
        .eq("id", postId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/posts/[id]/comments/[commentId] error:", error)
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    )
  }
}
