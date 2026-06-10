"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  queryId: string
  existingReply?: string | null
}

export function SupportReplyForm({ queryId, existingReply }: Props) {
  const router = useRouter()
  const [reply, setReply] = useState(existingReply ?? "")
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    const trimmed = reply.trim()

    if (!trimmed) {
      toast.error("Please write a response")
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/admin/support/${queryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_reply: trimmed,
          status: "closed",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Failed to send response")
        return
      }

      toast.success("Response saved")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-w-[280px] space-y-2">
      <Textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Write response..."
        className="min-h-20 resize-none rounded-xl text-sm"
        maxLength={2000}
      />

      <Button
        size="sm"
        onClick={handleSend}
        disabled={loading}
        className="w-full rounded-full"
      >
        {loading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Send className="mr-2 size-4" />
        )}
        {existingReply ? "Update Response" : "Send Response"}
      </Button>
    </div>
  )
}