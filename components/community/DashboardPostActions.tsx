"use client"

import Link from "next/link"
import { useState } from "react"
import { Heart, MessageSquare, Loader2 } from "lucide-react"

type DashboardPostActionsProps = {
  postId: string
  initialLiked: boolean
  initialLikes: number
  comments: number
  isSaved: boolean
}

export function DashboardPostActions({
  postId,
  initialLiked,
  initialLikes,
  comments,
  isSaved,
}: DashboardPostActionsProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [likes, setLikes] = useState(initialLikes)
  const [loading, setLoading] = useState(false)

  const handleLike = async () => {
    if (loading) return

    const previousLiked = liked
    const previousLikes = likes
    const nextLiked = !liked

    setLiked(nextLiked)
    setLikes((current) => Math.max(0, current + (nextLiked ? 1 : -1)))
    setLoading(true)

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      })

      if (!res.ok) {
        setLiked(previousLiked)
        setLikes(previousLikes)
        return
      }

      const data = await res.json().catch(() => null)

      if (typeof data?.liked === "boolean") {
        setLiked(data.liked)
      }

      const newLikes =
        typeof data?.likes_count === "number"
          ? data.likes_count
          : typeof data?.likesCount === "number"
            ? data.likesCount
            : null

      if (typeof newLikes === "number") {
        setLikes(newLikes)
      }
    } catch {
      setLiked(previousLiked)
      setLikes(previousLikes)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleLike}
          disabled={loading}
          className="inline-flex items-center gap-1 transition-colors hover:text-primary disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Heart
              className={`size-4 ${
                liked ? "fill-primary text-primary" : ""
              }`}
            />
          )}
          {likes}
        </button>

        <Link
          href={`/community/${postId}`}
          className="inline-flex items-center gap-1 transition-colors hover:text-primary"
        >
          <MessageSquare className="size-4" />
          {comments}
        </Link>
      </div>

      {isSaved && (
        <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
          Saved
        </span>
      )}
    </div>
  )
}
