"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CircleHelp,
  Hand,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const categories = [
  {
    value: "win" as const,
    label: "Practice Win",
    icon: Sparkles,
  },
  {
    value: "question" as const,
    label: "Question",
    icon: CircleHelp,
  },
  {
    value: "discussion" as const,
    label: "Reflection",
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
      toast.success("Reflection shared!")
      router.refresh()
    } catch {
      toast.error("Failed to share reflection")
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="rounded-3xl border border-[#C89B3C]/20 bg-[#F7F0E3] p-3 shadow-sm shadow-black/5 sm:p-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share a practice win, ask a question, or write a reflection..."
        maxLength={2000}
        rows={3}
        className="mb-3 min-h-24 resize-none border-0 bg-transparent p-0 text-sm text-[#4B3A25] shadow-none placeholder:text-[#6F7358]/70 focus-visible:ring-0 sm:min-h-20"
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
                      ? "border-[#C89B3C]/50 bg-[#C89B3C] text-[#122015] shadow-sm shadow-black/10"
                      : "border-[#C89B3C]/20 bg-[#E8DDC8] text-[#6F7358] hover:border-[#C89B3C]/45 hover:text-[#4B3A25]"
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
          className="h-10 w-full rounded-full bg-[#C89B3C] font-semibold text-[#122015] hover:bg-[#D8B76A] sm:w-auto"
        >
          {isPosting ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 size-4" />
          )}
          Share
        </Button>
      </div>
    </div>
  )
}