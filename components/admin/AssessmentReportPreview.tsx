"use client"

// ============================================================
// AssessmentReportPreview — render a stub report draft and
// expose approve/reject actions with keyboard hotkeys.
//
// Hotkeys:
//   a → approve (two-press confirmation; first press toasts a hint,
//       second press within 1.5s actually fires)
//   r → open reject dialog
//   Escape → close dialog (Radix Dialog handles this natively too)
//
// All hotkeys are no-ops when the user is typing in an input,
// textarea, contenteditable element, or open combobox/listbox.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  ArrowLeft,
  Check,
  Download,
  Loader2,
  ShieldAlert,
  Target,
  Trophy,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { FORCE_KEYS, VERTICALS, type ForceKey } from "@/lib/audit/types"
import { REPORT_AUTO_APPROVE_DISABLED } from "@/lib/report/feature-flags"
import type {
  ApproveDraftResponse,
  RejectDraftResponse,
  ReportDraftStatus,
  StubReportPayload,
} from "@/types/assessment"

type Props = {
  draftId: string
  version: number
  status: ReportDraftStatus
  createdAt: string
  reviewedAt: string | null
  reviewNote: string | null
  payload: StubReportPayload
}

const VERTICAL_LABELS: Record<string, string> = Object.fromEntries(
  VERTICALS.map((v) => [v.value, v.label]),
)

const FORCE_LABELS: Record<ForceKey, string> = {
  identity: "Identity",
  x_factor: "X-Factor",
  marketing: "Marketing",
  sales: "Sales",
  financial: "Financial",
  optimisation: "Optimisation",
  scale: "Scale",
  owner_energy: "Owner Energy",
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  if (target.getAttribute("role") === "combobox") return true
  if (target.getAttribute("role") === "listbox") return true
  return false
}

export function AssessmentReportPreview({
  draftId,
  version,
  status,
  createdAt,
  reviewedAt,
  reviewNote,
  payload,
}: Props) {
  const router = useRouter()

  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState("")

  // Two-press confirmation state for the `a` hotkey + Approve button.
  // First press primes the confirmation; second press within 1.5 sec fires.
  const [approveArmed, setApproveArmed] = useState(false)
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const readOnly = status !== "draft"

  const handleApprove = useCallback(async () => {
    if (readOnly) return
    setApproving(true)
    try {
      const res = await fetch(
        `/api/admin/report-drafts/${draftId}/approve`,
        { method: "POST" },
      )
      const data = (await res.json()) as ApproveDraftResponse
      if (!res.ok || data.ok === false) {
        const msg =
          data && "error" in data ? data.error : "Failed to approve draft"
        toast.error(msg)
        return
      }
      toast.success("Approved. Email sent.")
      // Soft pause so the admin sees the success state before navigating.
      setTimeout(() => router.push("/admin/assessment-reports"), 1000)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve draft")
    } finally {
      setApproving(false)
    }
  }, [draftId, router, readOnly])

  function armApprove() {
    if (readOnly) return
    if (approveArmed) {
      // Confirmed — actually fire.
      setApproveArmed(false)
      if (armTimerRef.current) clearTimeout(armTimerRef.current)
      void handleApprove()
      return
    }
    setApproveArmed(true)
    toast("Press Approve again to confirm.", { duration: 1500 })
    if (armTimerRef.current) clearTimeout(armTimerRef.current)
    armTimerRef.current = setTimeout(() => setApproveArmed(false), 1500)
  }

  async function handleReject() {
    if (rejectNote.trim().length < 5) {
      toast.error("Reject note must be at least 5 characters.")
      return
    }
    setRejecting(true)
    try {
      const res = await fetch(
        `/api/admin/report-drafts/${draftId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: rejectNote.trim() }),
        },
      )
      const data = (await res.json()) as RejectDraftResponse
      if (!res.ok || data.ok === false) {
        const msg =
          data && "error" in data ? data.error : "Failed to reject draft"
        toast.error(msg)
        return
      }
      toast.success("Rejected. Sent back for regeneration.")
      setRejectOpen(false)
      setTimeout(() => router.push("/admin/assessment-reports"), 600)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject draft")
    } finally {
      setRejecting(false)
    }
  }

  // Hotkeys: a (approve, two-press), r (reject dialog), Escape (close dialog).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return

      if (e.key === "Escape" && rejectOpen) {
        // Radix already handles Escape inside the dialog, but covers the
        // case where focus has drifted to the page background.
        setRejectOpen(false)
        return
      }
      if (readOnly) return
      if (rejectOpen) return

      if (e.key === "a" || e.key === "A") {
        e.preventDefault()
        if (REPORT_AUTO_APPROVE_DISABLED) {
          toast("Auto-approve is paused — see banner above for details.", {
            duration: 2500,
          })
          return
        }
        armApprove()
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault()
        setRejectOpen(true)
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejectOpen, readOnly, approveArmed])

  useEffect(() => {
    return () => {
      if (armTimerRef.current) clearTimeout(armTimerRef.current)
    }
  }, [])

  const verticalLabel =
    payload.founder.vertical_label ??
    VERTICAL_LABELS[payload.founder.vertical] ??
    payload.founder.vertical

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link href="/admin/assessment-reports">
            <ArrowLeft className="size-4 mr-1" />
            Back to queue
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {payload.founder.full_name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {payload.founder.business_name} · {verticalLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">
              Submitted {format(new Date(createdAt), "d MMM yyyy, h:mm a")} ·
              Draft v{version}
            </p>
            <div className="mt-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/api/admin/report-drafts/${draftId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="size-4 mr-1" />
                  Download PDF (preview)
                </a>
              </Button>
            </div>
            {readOnly && reviewedAt && (
              <p className="text-xs mt-1">
                <Badge
                  variant="secondary"
                  className={
                    status === "approved"
                      ? "bg-green-500/10 text-green-500"
                      : status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                  }
                >
                  {status}
                </Badge>{" "}
                <span className="text-muted-foreground">
                  on {format(new Date(reviewedAt), "d MMM yyyy, h:mm a")}
                </span>
              </p>
            )}
            {reviewNote && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Note: {reviewNote}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Phase 1 stub banner */}
      <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm flex items-start gap-2">
        <ShieldAlert className="size-4 text-amber-600 shrink-0 mt-0.5" />
        <p>{payload.stub_note}</p>
      </div>

      {/* Archetype */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            Archetype
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold mb-1">{payload.archetype.name}</p>
          <p className="text-muted-foreground">{payload.archetype.one_liner}</p>
          <p className="text-sm text-muted-foreground mt-3">
            Second-closest:{" "}
            <span className="font-medium">{payload.archetype.secondary}</span>
          </p>
        </CardContent>
      </Card>

      {/* Lie */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>The Lie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold mb-3">{payload.lie.name}</p>
          <p className="text-sm font-medium text-muted-foreground mb-1.5">
            Why we think you hold this:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {payload.lie.why_we_think_you_hold_this.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="text-sm mt-3 italic text-muted-foreground">
            {payload.lie.contradiction}
          </p>
        </CardContent>
      </Card>

      {/* Scores */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Scores (0–5)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground font-medium">
                    Force
                  </th>
                  <th className="text-right py-2 text-muted-foreground font-medium">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {FORCE_KEYS.map((key) => {
                  const score = payload.scores?.[key]
                  return (
                    <tr key={key} className="border-b last:border-0">
                      <td className="py-2">{FORCE_LABELS[key]}</td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {typeof score === "number" ? score.toFixed(1) : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Named Move */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5 text-primary" />
            Named Move
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold mb-1">
            {payload.named_move.title}
          </p>
          <p className="text-muted-foreground">{payload.named_move.promise}</p>
          <p className="text-sm mt-3">
            <span className="text-muted-foreground">Target metric: </span>
            <span className="font-medium">
              {payload.named_move.target_metric}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Pipeline-paused banner — shown while auto-approve is disabled. */}
      {!readOnly && REPORT_AUTO_APPROVE_DISABLED && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold mb-1">Auto-approve is paused</p>
          <p className="text-amber-800">
            The previous PDF renderer produced a broken document and has been
            retired. The new v1 template lives in the repo at{" "}
            <code className="text-xs bg-amber-100 px-1 py-0.5 rounded">
              lib/report/templates/scale-code-diagnostic-v1/
            </code>
            . For now, generate the report by hand using the template and
            upload the approved PDF via the manual flow (coming next). The
            Approve button is disabled until the new pipeline ships.
          </p>
        </div>
      )}

      {/* Sticky bottom action bar */}
      {!readOnly && (
        <div className="fixed bottom-0 inset-x-0 md:left-64 border-t bg-background/95 backdrop-blur z-40">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/assessment-reports")}
            >
              <ArrowLeft className="size-4 mr-1" />
              Back to queue
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline mr-2">
                {REPORT_AUTO_APPROVE_DISABLED ? (
                  <>
                    <kbd className="px-1.5 py-0.5 rounded border bg-muted opacity-50">
                      a
                    </kbd>{" "}
                    <span className="opacity-50">approve (paused)</span> ·{" "}
                  </>
                ) : (
                  <>
                    <kbd className="px-1.5 py-0.5 rounded border bg-muted">
                      a
                    </kbd>{" "}
                    approve ·{" "}
                  </>
                )}
                <kbd className="px-1.5 py-0.5 rounded border bg-muted">r</kbd>{" "}
                reject
              </span>
              <Button
                variant="outline"
                asChild
                disabled={approving}
                title="Render the current draft as PDF — does not approve or email"
              >
                <a
                  href={`/api/admin/report-drafts/${draftId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="size-4 mr-1" />
                  Download PDF
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectOpen(true)}
                disabled={approving}
              >
                <X className="size-4 mr-1" />
                Reject
              </Button>
              <Button
                onClick={armApprove}
                disabled={approving || REPORT_AUTO_APPROVE_DISABLED}
                title={
                  REPORT_AUTO_APPROVE_DISABLED
                    ? "Auto-approve is paused while the new report pipeline is built."
                    : undefined
                }
                className="bg-[#E53935] hover:bg-[#E53935]/90 text-white disabled:opacity-50"
              >
                {approving ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Check className="size-4 mr-1" />
                )}
                {REPORT_AUTO_APPROVE_DISABLED
                  ? "Approve (paused)"
                  : approveArmed
                    ? "Press again to confirm"
                    : "Approve"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject draft</DialogTitle>
            <DialogDescription>
              Leave a note for regeneration. Min 5 characters. The submission
              will requeue for a fresh draft.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="What's off about this draft? (e.g. archetype mismatch, scores look inverted, lie doesn't match the contradiction)"
            rows={5}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting || rejectNote.trim().length < 5}
            >
              {rejecting && <Loader2 className="size-4 animate-spin mr-2" />}
              Reject and requeue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
