"use client"

// ============================================================
// AssessmentReportsQueue — admin triage of pending report drafts.
//
// FIFO list (the API already returns oldest-first when status=draft).
// Keyboard navigation: j/k or ↑/↓ to move highlight, Enter to open.
// Handlers ignore key events when an input/textarea is focused so
// filter dropdowns and future search boxes stay safe.
// ============================================================

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Inbox, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { VERTICALS } from "@/lib/audit/types"
import type { ReportDraftRow, ReportDraftStatus } from "@/types/assessment"

type Props = {
  initial: ReportDraftRow[]
  initialStatus: ReportDraftStatus
}

const STATUS_OPTIONS: { value: ReportDraftStatus; label: string }[] = [
  { value: "draft", label: "Awaiting review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "superseded", label: "Superseded" },
]

const VERTICAL_LABELS: Record<string, string> = Object.fromEntries(
  VERTICALS.map((v) => [v.value, v.label]),
)

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  // Radix Select / combobox triggers behave like inputs for keyboard nav.
  if (target.getAttribute("role") === "combobox") return true
  if (target.getAttribute("role") === "listbox") return true
  return false
}

export function AssessmentReportsQueue({ initial, initialStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<ReportDraftStatus>(initialStatus)
  const [rows, setRows] = useState<ReportDraftRow[]>(initial)
  const [highlight, setHighlight] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQueue = useCallback(
    async (next: ReportDraftStatus) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/admin/report-drafts?status=${next}&limit=100`,
        )
        const data = await res.json()
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error ?? "Failed to load drafts")
        }
        setRows((data.drafts ?? []) as ReportDraftRow[])
        setHighlight(0)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load drafts")
        setRows([])
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // Reload whenever the status filter changes (skip first mount — server
  // already gave us the initial set).
  useEffect(() => {
    if (status === initialStatus) return
    void fetchQueue(status)
  }, [status, initialStatus, fetchQueue])

  // Clamp highlight when rows shrink.
  useEffect(() => {
    if (highlight >= rows.length) setHighlight(Math.max(0, rows.length - 1))
  }, [rows.length, highlight])

  // Keyboard navigation. Guarded against input/textarea focus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return
      if (rows.length === 0) return

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault()
        setHighlight((h) => Math.min(rows.length - 1, h + 1))
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault()
        setHighlight((h) => Math.max(0, h - 1))
      } else if (e.key === "Enter") {
        e.preventDefault()
        const row = rows[highlight]
        if (row) router.push(`/admin/assessment-reports/${row.id}`)
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [rows, highlight, router])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>
            Drafts
            {status === "draft" && rows.length > 0 && (
              <span className="text-muted-foreground font-normal">
                {" "}
                ({rows.length} awaiting)
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ReportDraftStatus)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void fetchQueue(status)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="size-4 mr-1" />
              )}
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-3">{error}</p>}

        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="size-10 text-muted-foreground/60 mb-3" />
            <p className="text-sm text-muted-foreground">
              {status === "draft"
                ? "No drafts awaiting review. Nice."
                : `No ${status} drafts.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row, idx) => {
              const highlighted = idx === highlight
              return (
                <button
                  type="button"
                  key={row.id}
                  onClick={() => setHighlight(idx)}
                  onDoubleClick={() =>
                    router.push(`/admin/assessment-reports/${row.id}`)
                  }
                  className={cn(
                    "w-full text-left flex items-center gap-3 rounded-lg border p-3 transition-colors",
                    highlighted
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/40",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{row.founder_name}</p>
                      <Badge variant="outline" className="text-xs">
                        v{row.version}
                      </Badge>
                      {row.generator !== "stub" && (
                        <Badge variant="secondary" className="text-xs">
                          {row.generator}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {row.business_name}
                      {row.vertical && (
                        <>
                          {" · "}
                          {VERTICAL_LABELS[row.vertical] ?? row.vertical}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {format(new Date(row.created_at), "d MMM, h:mm a")}
                    </p>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/admin/assessment-reports/${row.id}`)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          e.stopPropagation()
                          router.push(
                            `/admin/assessment-reports/${row.id}`,
                          )
                        }
                      }}
                      className={cn(
                        "inline-flex items-center justify-center mt-1 h-8 rounded-md px-3 text-xs font-medium transition-colors",
                        highlighted
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border bg-background hover:bg-accent",
                      )}
                    >
                      Review
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>
            {rows.length > 0
              ? `${highlight + 1} / ${rows.length}`
              : "—"}
          </span>
          <span className="font-mono">
            <kbd className="px-1.5 py-0.5 rounded border bg-muted">j</kbd>
            <kbd className="px-1.5 py-0.5 rounded border bg-muted ml-1">k</kbd>{" "}
            navigate ·{" "}
            <kbd className="px-1.5 py-0.5 rounded border bg-muted">Enter</kbd>{" "}
            open
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
