"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CircleHelp,
  Hand,
  Loader2,
  MessageCircle,
  Send,
  Trophy,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const categories = [
  {
    value: "win" as const,
    label: "Win",
    icon: Trophy,
  },
  {
    value: "question" as const,
    label: "Question",
    icon: CircleHelp,
  },
  {
    value: "discussion" as const,
    label: "Discussion",
    icon: MessageCircle,
  },
  {
    value: "introduction" as const,
    label: "Introduction",
    icon: Hand,
  },
]

type CategoryValue = "win" | "question" | "discussion" | "introduction"

type Props = {
  promptId?: string
  defaultContent?: string
  defaultCategory?: CategoryValue
}

export function ComposeBox({
  promptId,
  defaultContent,
  defaultCategory,
}: Props = {}) {
  const router = useRouter()
  const [content, setContent] = useState(defaultContent ?? "")
  const [category, setCategory] = useState<CategoryValue>(
    defaultCategory ?? "discussion"
  )
  const [isPosting, setIsPosting] = useState(false)

  async function handlePost() {
    const trimmed = content.trim()
    if (!trimmed || isPosting) return

    setIsPosting(true)

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          category,
          ...(promptId && { prompt_id: promptId }),
        }),
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
    <div className="rounded-3xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share a win, ask a question, or start a discussion..."
        maxLength={2000}
        rows={3}
        className="mb-3 min-h-24 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 sm:min-h-20"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon
              const isActive = category === cat.value

              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-border/60 bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        <Button
          size="sm"
          onClick={handlePost}
          disabled={!content.trim() || isPosting}
          className="h-10 w-full rounded-full sm:w-auto"
        >
          {isPosting ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 size-4" />
          )}
          Post
        </Button>
      </div>
    </div>
  )
}