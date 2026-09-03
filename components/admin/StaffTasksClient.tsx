"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Check, Loader2, RotateCcw } from "lucide-react"

type Task = {
  id: string
  member_user_id: string
  reason: string
  is_completed: boolean
  created_at: string
  completed_at: string | null
}

type Props = {
  open: Task[]
  done: Task[]
  names: Record<string, string>
}

export function StaffTasksClient({ open, done, names }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)

  async function toggle(id: string, isCompleted: boolean) {
    setBusy(id)
    try {
      const res = await fetch("/api/admin/staff-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_completed: isCompleted }),
      })

      const isJson = res.headers.get("content-type")?.includes("application/json")
      if (!isJson) {
        toast.error("Your session has expired. Please sign in again.")
        router.push("/login")
        return
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not update")

      toast.success(isCompleted ? "Marked done" : "Reopened")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update")
    } finally {
      setBusy(null)
    }
  }

  const list = showDone ? done : open

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={showDone ? "outline" : "default"}
          onClick={() => setShowDone(false)}
        >
          Open ({open.length})
        </Button>
        <Button
          size="sm"
          variant={showDone ? "default" : "outline"}
          onClick={() => setShowDone(true)}
        >
          Done ({done.length})
        </Button>
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
          {showDone
            ? "Nothing completed yet."
            : "Nothing to chase. The list is clear."}
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((task) => (
            <li
              key={task.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/60 bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/members?q=${encodeURIComponent(names[task.member_user_id] ?? "")}`}
                  className="text-sm font-semibold hover:text-primary hover:underline"
                >
                  {names[task.member_user_id] ?? "Unknown member"}
                </Link>

                <p className="mt-0.5 text-sm text-muted-foreground">
                  {task.reason}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {task.is_completed && task.completed_at
                    ? `Done ${new Date(task.completed_at).toLocaleDateString("en-IN")}`
                    : `Raised ${new Date(task.created_at).toLocaleDateString("en-IN")}`}
                </p>
              </div>

              <Button
                size="sm"
                variant={task.is_completed ? "outline" : "default"}
                disabled={busy === task.id}
                onClick={() => toggle(task.id, !task.is_completed)}
              >
                {busy === task.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : task.is_completed ? (
                  <>
                    <RotateCcw className="mr-1 size-4" />
                    Reopen
                  </>
                ) : (
                  <>
                    <Check className="mr-1 size-4" />
                    Done
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
