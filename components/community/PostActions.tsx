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

      toast.success("Reflection deleted")
      setDeleteOpen(false)
      router.refresh()
    } catch {
      toast.error("Failed to delete reflection")
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

      toast.success(isPinned ? "Reflection unpinned" : "Reflection pinned")
      router.refresh()
    } catch {
      toast.error("Failed to update pin status")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="cursor-pointer rounded-md p-1 text-[#6F7358] transition-colors hover:bg-[#C89B3C]/10 hover:text-[#C89B3C]">
            <MoreVertical size={16} />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="border-[#C89B3C]/25 bg-[#F7F0E3] text-[#4B3A25]"
        >
          {isAdmin && (
            <DropdownMenuItem
              onClick={handlePin}
              className="cursor-pointer focus:bg-[#C89B3C]/10 focus:text-[#8A6A22]"
            >
              {isPinned ? <PinOff /> : <Pin />}
              {isPinned ? "Unpin reflection" : "Pin reflection"}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="cursor-pointer text-[#8A6A22] focus:bg-[#C89B3C]/10 focus:text-[#4B3A25]"
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete reflection?"
        description="This action cannot be undone. The reflection and all its comments will be permanently deleted."
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  )
}