"use client"

import { useState } from "react"
import { Send, Trash2, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"
import type { CommentWithAuthor } from "@/types"

interface CommentSectionProps {
  postId: string
  initialComments: CommentWithAuthor[]
  currentUserId: string
  userRole: "member" | "admin"
}

export function CommentSection({
  postId,
  initialComments,
  currentUserId,
  userRole,
}: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments)
  const [content, setContent] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isAdmin = userRole === "admin"

  async function handleAdd() {
    const trimmed = content.trim()
    if (!trimmed || isPosting) return

    setIsPosting(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      })
      if (!res.ok) throw new Error("Failed")

      const newComment: CommentWithAuthor = await res.json()
      setComments((prev) => [...prev, newComment])
      setContent("")
      toast.success("Reflection added")
    } catch {
      toast.error("Failed to add reflection")
    } finally {
      setIsPosting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget || isDeleting) return

    setIsDeleting(true)
    try {
      const res = await fetch(
        `/api/posts/${postId}/comments/${deleteTarget}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Failed")

      setComments((prev) => prev.filter((c) => c.id !== deleteTarget))
      toast.success("Reflection deleted")
      setDeleteTarget(null)
    } catch {
      toast.error("Failed to delete reflection")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        Reflections ({comments.length})
      </h3>

      <div className="flex gap-3">
        <Avatar size="sm" className="mt-1 border border-teal-500/20">
          <AvatarFallback className="bg-teal-500/10 text-teal-300">
            You
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your reflection..."
            maxLength={1000}
            rows={2}
            className="mb-2 resize-none border-teal-500/20 focus-visible:ring-teal-500"
          />

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!content.trim() || isPosting}
              className="bg-teal-500 text-white hover:bg-teal-600"
            >
              {isPosting ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 size-4" />
              )}
              Reflect
            </Button>
          </div>
        </div>
      </div>

      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => {
            const canDelete = comment.user_id === currentUserId || isAdmin
            const authorName = comment.profiles?.full_name ?? "Anonymous"
            const initials = authorName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()

            return (
              <div key={comment.id} className="flex gap-3">
                <Avatar size="sm" className="mt-0.5 border border-teal-500/20">
                  <AvatarFallback className="bg-teal-500/10 text-teal-300">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="text-sm font-medium">{authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {comment.content}
                  </p>
                </div>

                {canDelete && (
                  <button
                    onClick={() => setDeleteTarget(comment.id)}
                    className="shrink-0 cursor-pointer p-1 text-muted-foreground transition-colors hover:text-teal-300"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete reflection?"
        description="This reflection will be permanently deleted."
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}