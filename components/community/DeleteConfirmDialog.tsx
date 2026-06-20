"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  isLoading: boolean
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="border-[#C89B3C]/25 bg-[#F7F0E3] text-[#4B3A25]"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-semibold text-[#4B3A25]">
            {title}
          </DialogTitle>

          <DialogDescription className="text-[#6F7358]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-[#C89B3C]/30 bg-transparent text-[#4B3A25] hover:bg-[#E8DDC8]"
          >
            Cancel
          </Button>

          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-[#C89B3C] font-semibold text-[#122015] hover:bg-[#D8B76A]"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}