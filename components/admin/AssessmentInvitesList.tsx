"use client"

// ============================================================
// AssessmentInvitesList — client-side filtered list of invites.
//
// Fetches GET /api/admin/invites with a status filter and simple
// prev/next pagination (50 per page). No realtime; admin reloads
// manually via the Refresh button.
// ============================================================

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Loader2, Mail, RefreshCw } from "lucide-react"
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
import { VERTICALS } from "@/lib/audit/types"
import type {
  AssessmentInviteStatus,
  ResendInviteResponse,
} from "@/types/assessment"

type InviteRow = {
  id: string
  email: string
  full_name: string
  phone: string | null
  vertical: string | null
  status: AssessmentInviteStatus
  opened_at: string | null
  consumed_at: string | null
  submission_id: string | null
  expires_at: string
  created_at: string
}

type Props = {
  refreshToken: number
  onChanged?: () => void
}

const PAGE_SIZE = 50

const STATUS_OPTIONS: { value: "all" | AssessmentInviteStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "issued", label: "Issued" },
  { value: "opened", label: "Opened" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "expired", label: "Expired" },
  { value: "revoked", label: "Revoked" },
]

const STATUS_STYLE: Record<AssessmentInviteStatus, string> = {
  issued: "bg-blue-500/10 text-blue-500",
  opened: "bg-blue-500/10 text-blue-500",
  in_progress: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  submitted: "bg-green-500/10 text-green-500",
  expired: "bg-muted text-muted-foreground",
  revoked: "bg-muted text-muted-foreground",
}

const VERTICAL_LABELS: Record<string, string> = Object.fromEntries(
  VERTICALS.map((v) => [v.value, v.label]),
)

export function AssessmentInvitesList({ refreshToken, onChanged }: Props) {
  const [statusFilter, setStatusFilter] = useState<"all" | AssessmentInviteStatus>(
    "all",
  )
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<InviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)

  async function resend(id: string) {
    setResendingId(id)
    try {
      const res = await fetch(`/api/admin/invites/${id}/resend`, {
        method: "POST",
      })
      const data: ResendInviteResponse = await res.json()
      if (!res.ok || data.ok === false) {
        const msg = data.ok === false ? data.error : "Failed to resend"
        throw new Error(msg)
      }
      if (data.email_sent) {
        toast.success("New invite emailed (old link is now invalid)")
      } else {
        toast.error(
          "Token rotated but email didn't send. Try resending again.",
        )
      }
      onChanged?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resend")
    } finally {
      setResendingId(null)
    }
  }

  const fetchPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const sp = new URLSearchParams()
      sp.set("limit", String(PAGE_SIZE))
      sp.set("offset", String(page * PAGE_SIZE))
      if (statusFilter !== "all") sp.set("status", statusFilter)
      const res = await fetch(`/api/admin/invites?${sp.toString()}`)
      const data = await res.json()
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? "Failed to load invites")
      }
      setRows((data.invites ?? []) as InviteRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invites")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    void fetchPage()
  }, [fetchPage, refreshToken])

  // Reset to page 0 whenever the filter changes.
  useEffect(() => {
    setPage(0)
  }, [statusFilter])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Invites</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void fetchPage()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="size-4 mr-1" />
            )}
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Status
            </label>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as "all" | AssessmentInviteStatus)
              }
            >
              <SelectTrigger className="w-56">
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
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-3">{error}</p>
        )}

        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No invites match this filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground font-medium">
                    Email
                  </th>
                  <th className="text-left py-2 text-muted-foreground font-medium">
                    Name
                  </th>
                  <th className="text-left py-2 text-muted-foreground font-medium hidden md:table-cell">
                    Vertical
                  </th>
                  <th className="text-center py-2 text-muted-foreground font-medium">
                    Status
                  </th>
                  <th className="text-left py-2 text-muted-foreground font-medium hidden sm:table-cell">
                    Issued
                  </th>
                  <th className="text-right py-2 text-muted-foreground font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-3 max-w-[220px] truncate">{row.email}</td>
                    <td className="py-3 max-w-[180px] truncate font-medium">
                      {row.full_name}
                    </td>
                    <td className="py-3 hidden md:table-cell text-muted-foreground">
                      {row.vertical
                        ? VERTICAL_LABELS[row.vertical] ?? row.vertical
                        : "—"}
                    </td>
                    <td className="py-3 text-center">
                      <Badge
                        variant="secondary"
                        className={STATUS_STYLE[row.status] ?? ""}
                      >
                        {row.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3 hidden sm:table-cell text-muted-foreground tabular-nums">
                      {format(new Date(row.created_at), "d MMM yyyy, h:mm a")}
                    </td>
                    <td className="py-3 text-right">
                      {row.status === "issued" || row.status === "opened" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void resend(row.id)}
                          disabled={resendingId === row.id}
                          title="Rotate the token and re-send the email. The old link becomes unusable."
                        >
                          {resendingId === row.id ? (
                            <Loader2 className="size-3.5 animate-spin mr-1" />
                          ) : (
                            <Mail className="size-3.5 mr-1" />
                          )}
                          Resend
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {row.status === "in_progress"
                            ? "In progress"
                            : row.status === "submitted"
                              ? "Submitted"
                              : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-4">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} · {rows.length} row{rows.length === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading || rows.length < PAGE_SIZE}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
