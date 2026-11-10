"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCcw } from "lucide-react"

type Props = {
  lastCompletedAt: string | null
  lastError: string | null
  inProgress: boolean
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs} h ago`
  return `${Math.round(hrs / 24)} days ago`
}

/**
 * Pulls new Razorpay data into the database. A sync runs as a series of
 * short server calls (functions time out), so this keeps calling until the
 * server says it's done — the first one reads ~28,000 payments and takes a
 * few minutes; later ones only fetch what's new.
 */
export function SyncButton({ lastCompletedAt, lastError, inProgress }: Props) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function run(mode: "incremental" | "full", resume = false) {
    setRunning(true)
    setMessage("Starting…")
    try {
      let first = !resume
      for (let i = 0; i < 200; i++) {
        const res = await fetch("/api/admin/billing/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(first ? { start: true, mode } : {}),
        })
        first = false
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Sync failed")
        setMessage(data.message)
        if (data.state?.error) throw new Error(data.state.error)
        if (data.done) {
          toast.success("Razorpay data is up to date")
          break
        }
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="text-xs text-muted-foreground">
        {running ? (
          <span className="text-foreground">{message}</span>
        ) : lastCompletedAt ? (
          <>Razorpay data from {timeAgo(lastCompletedAt)}</>
        ) : (
          <span className="font-medium text-amber-600">Never synced — press Sync now</span>
        )}
        {!running && lastError && (
          <span className="ml-2 text-destructive">Last sync stopped: {lastError}</span>
        )}
      </div>

      {inProgress && !running ? (
        <Button size="sm" variant="outline" onClick={() => run("incremental", true)}>
          <RefreshCcw className="mr-1.5 size-3.5" />
          Resume sync
        </Button>
      ) : null}

      <Button size="sm" onClick={() => run("incremental")} disabled={running}>
        {running ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <RefreshCcw className="mr-1.5 size-3.5" />
        )}
        Sync now
      </Button>

      <Button
        size="sm"
        variant="ghost"
        disabled={running}
        onClick={() => {
          if (window.confirm("Re-read everything from 1 June? Takes a few minutes.")) run("full")
        }}
        title="Re-read all Razorpay data from 1 June, not just what's new"
      >
        Full resync
      </Button>
    </div>
  )
}
