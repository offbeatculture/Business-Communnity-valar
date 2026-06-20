"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { toast } from "sonner"

interface LikeButtonProps {
  postId: string
  initialLiked: boolean
  initialCount: number
}

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)

  async function toggle() {
    if (pending) return

    const wasLiked = liked
    const prevCount = count

    setLiked(!wasLiked)
    setCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1)
    setPending(true)

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: wasLiked ? "DELETE" : "POST",
      })

      if (!res.ok) throw new Error("Failed")
    } catch {
      setLiked(wasLiked)
      setCount(prevCount)
      toast.error("Something went wrong")
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={toggle}
      className="group flex cursor-pointer items-center gap-1.5 text-sm transition-colors"
      disabled={pending}
    >
      <Heart
        size={18}
        className={
          liked
            ? "fill-[#C89B3C] text-[#C89B3C]"
            : "text-[#6F7358] group-hover:text-[#C89B3C]"
        }
      />

      <span className={liked ? "text-[#C89B3C]" : "text-[#6F7358]"}>
        {count > 0 ? count : ""}
      </span>
    </button>
  )
}