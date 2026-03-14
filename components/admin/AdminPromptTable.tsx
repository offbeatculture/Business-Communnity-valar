"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Pencil } from "lucide-react"
import { AdminPromptForm } from "./AdminPromptForm"
import type { DailyPrompt } from "@/types"

type Props = {
  prompts: DailyPrompt[]
}

const categoryColors: Record<string, string> = {
  reflection: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  challenge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  number: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  advice: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  wins: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
}

export function AdminPromptTable({ prompts }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/prompts/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast.success("Prompt deleted")
      router.refresh()
    } catch {
      toast.error("Failed to delete prompt")
    } finally {
      setDeletingId(null)
    }
  }

  if (prompts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No prompts created yet
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {prompts.map((prompt) => (
        <div key={prompt.id}>
          {editingId === prompt.id ? (
            <div className="border rounded-lg p-4">
              <AdminPromptForm
                editingPrompt={prompt}
                onDone={() => setEditingId(null)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(prompt.scheduled_date + "T00:00:00"), "EEE, MMM d, yyyy")}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${categoryColors[prompt.category] ?? ""}`}
                  >
                    {prompt.category}
                  </Badge>
                  {!prompt.is_active && (
                    <Badge variant="outline" className="text-[10px]">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{prompt.prompt_text}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(prompt.id)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(prompt.id)}
                  disabled={deletingId === prompt.id}
                >
                  <Trash2 className="size-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
