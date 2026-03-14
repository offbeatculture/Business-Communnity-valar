"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Loader2, Clock, MessageSquare, Sparkles, Check } from "lucide-react"
import type { DailyPrompt } from "@/types"

type Props = {
  prompt: DailyPrompt
  responseCount: number
  hasResponded: boolean
}

function getTimeUntilMidnightIST(): string {
  const now = new Date()
  // Get current time in IST
  const istOffset = 5.5 * 60 * 60 * 1000
  const istNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffset)
  const istMidnight = new Date(istNow)
  istMidnight.setHours(24, 0, 0, 0)
  const diff = istMidnight.getTime() - istNow.getTime()

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

const categoryLabels: Record<string, string> = {
  reflection: "Reflection",
  challenge: "Challenge",
  number: "By the Numbers",
  advice: "Advice",
  wins: "Wins",
}

export function DailyPromptCard({ prompt, responseCount, hasResponded: initialHasResponded }: Props) {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnightIST())
  const [hasResponded, setHasResponded] = useState(initialHasResponded)
  const [isExpanded, setIsExpanded] = useState(false)
  const [content, setContent] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [otherResponses, setOtherResponses] = useState<
    { id: string; content: string; profiles: { full_name: string; avatar_url: string | null } }[]
  >([])
  const [loadingResponses, setLoadingResponses] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeUntilMidnightIST())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!hasResponded) return
    setLoadingResponses(true)
    fetch(`/api/posts?prompt_id=${prompt.id}&limit=5`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setOtherResponses(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingResponses(false))
  }, [hasResponded, prompt.id])

  async function handleRespond() {
    const trimmed = content.trim()
    if (!trimmed || isPosting) return

    setIsPosting(true)
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          category: "discussion",
          prompt_id: prompt.id,
        }),
      })

      if (!res.ok) throw new Error("Failed")

      setContent("")
      setHasResponded(true)
      setIsExpanded(false)
      toast.success("Response shared! +27 GP earned")
      router.refresh()
    } catch {
      toast.error("Failed to post response")
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <Card className="border-red-500/20 bg-red-500/[0.02] border-l-4 border-l-red-500 shadow-lg shadow-red-500/5">
      <CardContent className="px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] uppercase tracking-wider">
            Daily Prompt — {categoryLabels[prompt.category] ?? prompt.category}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            Closes in {timeLeft}
          </span>
        </div>

        <div className="relative">
          <span className="absolute -top-1 -left-1 text-4xl font-serif text-red-500/10 select-none">&ldquo;</span>
          <p className="text-base font-medium mb-3 leading-relaxed pl-4">{prompt.prompt_text}</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            {responseCount > 0 && (
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-green-500" />
              </span>
            )}
            <MessageSquare className="size-3" />
            {responseCount} {responseCount === 1 ? "response" : "responses"} today
          </span>

          {hasResponded ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <Check className="size-3 mr-1" />
              Responded
            </Badge>
          ) : !isExpanded ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">+27 GP</span>
              <Button size="sm" onClick={() => setIsExpanded(true)} className="active:scale-95 transition-transform">
                <Sparkles className="size-4 mr-1.5" />
                Respond
              </Button>
            </div>
          ) : null}
        </div>

        {isExpanded && !hasResponded && (
          <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts..."
              maxLength={2000}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsExpanded(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRespond}
                disabled={!content.trim() || isPosting}
                className="active:scale-95 transition-transform"
              >
                {isPosting ? (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="size-4 mr-1.5" />
                )}
                Post Response
              </Button>
            </div>
          </div>
        )}

        {hasResponded && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Recent responses</p>
            {loadingResponses ? (
              <div className="flex justify-center py-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : otherResponses.length > 0 ? (
              <div className="space-y-2">
                {otherResponses.map((r) => (
                  <div key={r.id} className="flex gap-2">
                    <Avatar className="size-6 shrink-0 mt-0.5">
                      <AvatarImage src={r.profiles.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {r.profiles.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{r.profiles.full_name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{r.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No other responses yet.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
