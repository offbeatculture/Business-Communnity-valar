"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DeleteConfirmDialog } from "@/components/community/DeleteConfirmDialog"
import { MoreHorizontal, Eye, CalendarPlus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

type Props = {
  profileId: string
  memberName: string
  onActionComplete: () => void
}

export function MemberActions({ profileId, memberName, onActionComplete }: Props) {
  const [extendOpen, setExtendOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleExtend(days: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/members/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extend_subscription", days }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to extend")
      }

      toast.success(`Subscription extended by ${days} days`)
      setExtendOpen(false)
      onActionComplete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to extend subscription")
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/members/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_member" }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to remove")
      }

      toast.success("Member removed")
      setRemoveOpen(false)
      onActionComplete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/members/${profileId}`}>
              <Eye className="size-3.5 mr-2" />
              View Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExtendOpen(true)}>
            <CalendarPlus className="size-3.5 mr-2" />
            Extend Subscription
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setRemoveOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-3.5 mr-2" />
            Remove Member
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Extend Subscription Dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Subscription</DialogTitle>
            <DialogDescription>
              Choose how many days to extend {memberName}&apos;s subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {[30, 90, 365].map((days) => (
              <Button
                key={days}
                variant="outline"
                onClick={() => handleExtend(days)}
                disabled={loading}
                className="justify-start"
              >
                {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                {days} days
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <DeleteConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove Member"
        description={`Are you sure you want to remove ${memberName}? This will permanently delete their account and all their data. This action cannot be undone.`}
        onConfirm={handleRemove}
        isLoading={loading}
      />
    </>
  )
}
