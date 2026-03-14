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
      toast.success("Comment added")
    } catch {
      toast.error("Failed to add comment")
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
      toast.success("Comment deleted")
      setDeleteTarget(null)
    } catch {
      toast.error("Failed to delete comment")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        Comments ({comments.length})
      </h3>

      {/* Add comment */}
      <div className="flex gap-3">
        <Avatar size="sm" className="mt-1">
          <AvatarFallback>You</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment..."
            maxLength={1000}
            rows={2}
            className="resize-none mb-2"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!content.trim() || isPosting}
            >
              {isPosting ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <Send className="size-4 mr-1.5" />
              )}
              Comment
            </Button>
          </div>
        </div>
      </div>

      {/* Comment list */}
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
                <Avatar size="sm" className="mt-0.5">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">{authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => setDeleteTarget(comment.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0 cursor-pointer"
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
        title="Delete comment?"
        description="This comment will be permanently deleted."
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}
