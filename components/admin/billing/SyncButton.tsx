"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Loader2, RefreshCcw } from "lucide-react"

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
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center">
        <Button
          size="sm"
          className="rounded-r-none"
          onClick={() => run("incremental", inProgress)}
          disabled={running}
        >
          {running ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
          {inProgress && !running ? "Resume sync" : "Sync now"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="rounded-l-none border-l border-primary-foreground/20 px-2" disabled={running} aria-label="More sync options">
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                if (window.confirm("Re-read everything from 1 June? Takes a few minutes.")) run("full")
              }}
            >
              Full resync from 1 June
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-xs text-muted-foreground">
        {running ? (
          <span className="text-foreground">{message}</span>
        ) : lastError ? (
          <span className="text-destructive">Last sync stopped: {lastError}</span>
        ) : lastCompletedAt ? (
          <>Synced {timeAgo(lastCompletedAt)}</>
        ) : (
          "Never synced"
        )}
      </p>
    </div>
  )
}
