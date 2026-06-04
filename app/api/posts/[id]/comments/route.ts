import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { awardPoints } from "@/lib/engagement"
import { GP_VALUES, COMMENT_SUBSTANTIVE_LENGTH } from "@/lib/engagement-constants"
import { createNotification } from "@/lib/notifications"

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createCommentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content: parsed.data.content,
      })
      .select("*")
      .single()

    if (commentError) {
      console.error("Create comment error:", commentError)
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      )
    }

    // Fetch the author's profile separately
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .single()

    const commentWithAuthor = {
      ...comment,
      profiles: profile ?? { full_name: "Anonymous", avatar_url: null },
    }

    // Increment comment_count + notify post owner via admin client
    const admin = createAdminClient()

    const { data: post } = await admin
      .from("posts")
      .select("id, comment_count, user_id")
      .eq("id", postId)
      .single()

    if (post) {
      await admin
        .from("posts")
        .update({ comment_count: (post.comment_count ?? 0) + 1 })
        .eq("id", postId)

      // Only reward + notify when commenting on someone else's post
      if (post.user_id !== user.id) {
        const commentGP =
          parsed.data.content.length >= COMMENT_SUBSTANTIVE_LENGTH
            ? GP_VALUES.comment_substantive
            : GP_VALUES.comment_short

        awardPoints(user.id, "comment", commentGP, comment.id).catch(() => {})
        awardPoints(
          post.user_id,
          "comment_received",
          GP_VALUES.comment_received,
          comment.id
        ).catch(() => {})

        await createNotification({
          userId: post.user_id,
          actorId: user.id,
          type: "comment",
          title: "New comment on your post",
          message: `${
            profile?.full_name || user.email || "Someone"
          } commented on your community post.`,
          linkUrl: `/community?post=${post.id}`,
          entityType: "post",
          entityId: post.id,
        })
      }
    }

    return NextResponse.json(commentWithAuthor, { status: 201 })
  } catch (error) {
    console.error("POST /api/posts/[id]/comments error:", error)
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    )
  }
}