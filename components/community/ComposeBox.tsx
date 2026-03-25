"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const categories = [
  { value: "win" as const, label: "Win", emoji: "🏆" },
  { value: "question" as const, label: "Question", emoji: "❓" },
  { value: "discussion" as const, label: "Discussion", emoji: "💬" },
  { value: "introduction" as const, label: "Introduction", emoji: "👋" },
]

type CategoryValue = "win" | "question" | "discussion" | "introduction"

type Props = {
  promptId?: string
  defaultContent?: string
  defaultCategory?: CategoryValue
}

export function ComposeBox({ promptId, defaultContent, defaultCategory }: Props = {}) {
  const router = useRouter()
  const [content, setContent] = useState(defaultContent ?? "")
  const [category, setCategory] = useState<CategoryValue>(defaultCategory ?? "discussion")
  const [isPosting, setIsPosting] = useState(false)

  async function handlePost() {
    const trimmed = content.trim()
    if (!trimmed || isPosting) return

    setIsPosting(true)
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, category, ...(promptId && { prompt_id: promptId }) }),
      })

      if (!res.ok) throw new Error("Failed")

      setContent("")
      setCategory("discussion")
      toast.success("Post shared!")
      router.refresh()
    } catch {
      toast.error("Failed to create post")
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share a win, ask a question, or start a discussion..."
        maxLength={2000}
        rows={3}
        className="resize-none mb-3 border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
      />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer border ${
                category === cat.value
                  ? "bg-red-500/10 text-red-500 border-red-500/30"
                  : "bg-secondary text-secondary-foreground border-transparent hover:text-foreground"
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={handlePost}
          disabled={!content.trim() || isPosting}
        >
          {isPosting ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <Send className="size-4 mr-1.5" />
          )}
          Post
        </Button>
      </div>
    </div>
  )
}
