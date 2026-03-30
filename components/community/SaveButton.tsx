"use client"

import { useState } from "react"
import { Bookmark } from "lucide-react"
import { toast } from "sonner"

interface SaveButtonProps {
  postId: string
  initialSaved: boolean
}

export function SaveButton({ postId, initialSaved }: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [pending, setPending] = useState(false)

  async function toggle() {
    if (pending) return

    const wasSaved = saved
    setSaved(!wasSaved)
    setPending(true)

    try {
      const res = await fetch(`/api/posts/${postId}/save`, {
        method: wasSaved ? "DELETE" : "POST",
      })
      if (!res.ok) throw new Error("Failed")
    } catch {
      setSaved(wasSaved)
      toast.error("Something went wrong")
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center transition-colors cursor-pointer group"
      disabled={pending}
    >
      <Bookmark
        size={18}
        className={
          saved
            ? "fill-primary text-primary"
            : "text-muted-foreground group-hover:text-foreground"
        }
      />
    </button>
  )
}
