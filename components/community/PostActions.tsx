"use client"

import { useState } from "react"
import { MoreVertical, Trash2, Pin, PinOff } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"

interface PostActionsProps {
  postId: string
  isOwner: boolean
  isAdmin: boolean
  isPinned: boolean
}

export function PostActions({
  postId,
  isOwner,
  isAdmin,
  isPinned,
}: PostActionsProps) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOwner && !isAdmin) return null

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast.success("Post deleted")
      setDeleteOpen(false)
      router.refresh()
    } catch {
      toast.error("Failed to delete post")
    } finally {
      setIsDeleting(false)
    }
  }

  async function handlePin() {
    try {
      const res = await fetch(`/api/posts/${postId}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: !isPinned }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success(isPinned ? "Post unpinned" : "Post pinned")
      router.refresh()
    } catch {
      toast.error("Failed to update pin status")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-md hover:bg-accent">
            <MoreVertical size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isAdmin && (
            <DropdownMenuItem onClick={handlePin}>
              {isPinned ? <PinOff /> : <Pin />}
              {isPinned ? "Unpin" : "Pin to top"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete post?"
        description="This action cannot be undone. The post and all its comments will be permanently deleted."
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  )
}
