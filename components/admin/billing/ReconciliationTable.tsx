"use client"

import { Fragment, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronDown, ChevronRight, ExternalLink, Loader2, Search, Wrench } from "lucide-react"
import {
  CATEGORY_LABELS,
  FLAG_LABELS,
  fmt,
  rupees,
  type FixAction,
  type FlagCode,
  type ReconRow,
  type Severity,
} from "@/lib/billing/reconcile"

const SEVERITY_STYLE: Record<Severity, string> = {
  high: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  low: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  info: "bg-muted text-muted-foreground border-border",
}

const ACCESS_STYLE = {
  active: "text-green-600 dark:text-green-400",
  lapsed: "text-amber-600 dark:text-amber-400",
  none: "text-muted-foreground",
}

type Filter = "attention" | "all" | FlagCode

/** The API takes only what it needs from a fix; labels are for display. */
function fixBody(fix: FixAction) {
  switch (fix.action) {
    case "extend_expiry":
      return { action: fix.action, subscriptionId: fix.subscriptionId, expiresAt: fix.expiresAt }
    case "set_amount":
      return { action: fix.action, subscriptionId: fix.subscriptionId, amountPaise: fix.amountPaise }
    case "set_tier":
    case "mark_expired":
      return { action: fix.action, subscriptionId: fix.subscriptionId }
    case "link_payment":
      return {
        action: fix.action,
        subscriptionId: fix.subscriptionId,
        paymentId: fix.paymentId,
        rzpSubscriptionId: fix.rzpSubscriptionId,
      }
    case "grant_complimentary":
      return { action: fix.action, userId: fix.userId, planLabel: fix.planLabel }
  }
}

export function ReconciliationTable({ rows }: { rows: ReconRow[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>("attention")
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<{ row: ReconRow; fix: FixAction; message: string } | null>(null)
  const [applying, setApplying] = useState(false)

  const flagCounts = useMemo(() => {
    const counts = new Map<FlagCode, number>()
    for (const r of rows) for (const f of r.flags) counts.set(f.code, (counts.get(f.code) ?? 0) + 1)
    return counts
  }, [rows])

  const attentionCount = rows.filter((r) => r.topSeverity === "high" || r.topSeverity === "medium").length

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => {
        if (filter === "attention") return r.topSeverity === "high" || r.topSeverity === "medium"
        if (filter === "all") return true
        return r.flags.some((f) => f.code === filter)
      })
      .filter((r) => {
        if (!q) return true
        const hay = [
          r.member?.email,
          r.member?.name,
          r.member?.phone,
          r.rzpSub?.email,
          r.rzpSub?.id,
          r.dbSub?.razorpay_payment_id,
          ...r.payments.map((p) => p.id),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => {
        const rank = (s: Severity | null) => (s ? ["high", "medium", "low", "info"].indexOf(s) : 9)
        return rank(a.topSeverity) - rank(b.topSeverity) || (a.member?.email ?? "").localeCompare(b.member?.email ?? "")
      })
  }, [rows, filter, query])

  async function applyFix() {
    if (!pending) return
    setApplying(true)
    try {
      const res = await fetch("/api/admin/billing/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fixBody(pending.fix)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Fix failed")
      toast.success(`${pending.fix.label} — done`)
      setPending(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fix failed")
    } finally {
      setApplying(false)
    }
  }

  const summary: { code: FlagCode; tone: Severity }[] = [
    { code: "paid_not_recorded", tone: "high" },
    { code: "paid_no_account", tone: "high" },
    { code: "setup_unfinished", tone: "high" },
    { code: "tier_restricted", tone: "high" },
    { code: "no_payment", tone: "high" },
    { code: "amount_mismatch", tone: "medium" },
    { code: "rzp_ended", tone: "medium" },
    { code: "staff_without_lifetime", tone: "medium" },
    { code: "unlinked_payment", tone: "low" },
    { code: "using_after_expiry", tone: "info" },
    { code: "other_product_only", tone: "info" },
  ]

  return (
    <div className="space-y-5">
      {/* Summary: each card filters the table */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <button
          onClick={() => setFilter("attention")}
          className={`rounded-xl border p-3 text-left transition ${filter === "attention" ? "border-primary ring-1 ring-primary" : "border-border/70 hover:border-primary/50"}`}
        >
          <div className="text-2xl font-bold">{attentionCount}</div>
          <div className="text-xs text-muted-foreground">Need attention</div>
        </button>
        {summary.map(({ code, tone }) => {
          const n = flagCounts.get(code) ?? 0
          return (
            <button
              key={code}
              onClick={() => setFilter(code)}
              disabled={!n}
              className={`rounded-xl border p-3 text-left transition disabled:opacity-40 ${filter === code ? "border-primary ring-1 ring-primary" : "border-border/70 hover:border-primary/50"}`}
            >
              <div className={`text-2xl font-bold ${n && tone === "high" ? "text-red-600 dark:text-red-400" : ""}`}>{n}</div>
              <div className="text-xs text-muted-foreground">{FLAG_LABELS[code]}</div>
            </button>
          )
        })}
        <button
          onClick={() => setFilter("all")}
          className={`rounded-xl border p-3 text-left transition ${filter === "all" ? "border-primary ring-1 ring-primary" : "border-border/70 hover:border-primary/50"}`}
        >
          <div className="text-2xl font-bold">{rows.length}</div>
          <div className="text-xs text-muted-foreground">Everyone</div>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone, pay_… or sub_…"
          className="pl-9"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {visible.length} of {rows.length}. Click a row for its full payment history.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-6 p-2" />
              <th className="p-2 font-medium">Member</th>
              <th className="p-2 font-medium">Type</th>
              <th className="p-2 font-medium">Membership (database)</th>
              <th className="p-2 font-medium">Razorpay</th>
              <th className="p-2 font-medium">Issues</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Nothing here. {filter === "attention" && "Everything that needs attention has been dealt with."}
                </td>
              </tr>
            )}
            {visible.map((r) => {
              const isOpen = open.has(r.key)
              return (
                <Fragment key={r.key}>
                  <tr
                    className="cursor-pointer border-t border-border/60 align-top hover:bg-muted/30"
                    onClick={() =>
                      setOpen((cur) => {
                        const next = new Set(cur)
                        if (next.has(r.key)) next.delete(r.key)
                        else next.add(r.key)
                        return next
                      })
                    }
                  >
                    <td className="p-2 pt-3 text-muted-foreground">
                      {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </td>
                    <td className="max-w-[220px] p-2">
                      <div className="truncate font-medium">{r.member?.name || r.rzpSub?.customer_name || "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.member?.email ?? r.rzpSub?.email ?? "no account"}
                      </div>
                    </td>
                    <td className="p-2 text-xs">{CATEGORY_LABELS[r.category]}</td>
                    <td className="p-2 text-xs">
                      <div className={`font-medium ${ACCESS_STYLE[r.access]}`}>
                        {r.access === "active" ? "Active" : r.access === "lapsed" ? "Lapsed" : "None"}
                        {r.dbSub && <span className="font-normal text-muted-foreground"> · {rupees(r.dbSub.amount_paid)}</span>}
                      </div>
                      <div className="text-muted-foreground">
                        {r.dbExpires ? `ends ${fmt(r.dbExpires)}` : "no membership"}
                        {r.dbSub?.tier && r.dbSub.tier !== "membership" && (
                          <span className="ml-1 text-amber-600">({r.dbSub.tier})</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-xs">
                      {r.rzpSub ? (
                        <div className="font-medium">{r.rzpSub.status}</div>
                      ) : (
                        <div className="text-muted-foreground">no subscription</div>
                      )}
                      <div className="text-muted-foreground">
                        {r.rzpPaidUntil ? `paid until ${fmt(r.rzpPaidUntil)}` : r.lastLifinityPayment ? "" : "no Lifinity payment"}
                      </div>
                    </td>
                    <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-1.5">
                        {r.flags.length === 0 && <span className="text-xs text-green-600">✓ Matches</span>}
                        {r.flags.map((f) => (
                          <div key={f.code} className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${SEVERITY_STYLE[f.severity]}`}
                              title={f.message}
                            >
                              {FLAG_LABELS[f.code]}
                            </span>
                            {f.fix && (
                              <Button
                                size="xs"
                                variant="outline"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => setPending({ row: r, fix: f.fix!, message: f.message })}
                              >
                                <Wrench className="mr-1 size-3" />
                                {f.fix.label}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="border-t border-border/40 bg-muted/20">
                      <td />
                      <td colSpan={5} className="p-3">
                        <div className="space-y-3 text-xs">
                          {r.flags.map((f) => (
                            <p key={f.code}>
                              <span className="font-medium">{FLAG_LABELS[f.code]}:</span> {f.message}
                            </p>
                          ))}

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <div className="mb-1 font-semibold">Database</div>
                              {r.dbSub ? (
                                <ul className="space-y-0.5 text-muted-foreground">
                                  <li>Plan: {r.dbSub.plan_label ?? r.dbSub.plan_name ?? "—"}</li>
                                  <li>Amount: {rupees(r.dbSub.amount_paid)} · tier {r.dbSub.tier} · {r.dbSub.status}</li>
                                  <li>{fmt(r.dbSub.starts_at)} → {fmt(r.dbSub.expires_at)}</li>
                                  <li>Razorpay link: {r.dbSub.razorpay_subscription_id ?? r.dbSub.razorpay_payment_id ?? "none"}</li>
                                </ul>
                              ) : (
                                <p className="text-muted-foreground">No membership record.</p>
                              )}
                            </div>
                            <div>
                              <div className="mb-1 font-semibold">Razorpay subscription</div>
                              {r.rzpSub ? (
                                <ul className="space-y-0.5 text-muted-foreground">
                                  <li>{r.rzpSub.id} · {r.rzpSub.status} · {r.rzpSub.paid_count ?? 0} paid</li>
                                  <li>Current cycle: {fmt(r.rzpSub.current_start)} → {fmt(r.rzpSub.current_end)}</li>
                                  <li>Next charge: {fmt(r.rzpSub.charge_at)}</li>
                                </ul>
                              ) : (
                                <p className="text-muted-foreground">None.</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="mb-1 font-semibold">Payments ({r.payments.length})</div>
                            {r.payments.length === 0 ? (
                              <p className="text-muted-foreground">No Razorpay payments under this email or phone since 1 June.</p>
                            ) : (
                              <table className="w-full">
                                <tbody>
                                  {r.payments.map((p) => (
                                    <tr key={p.id} className="border-t border-border/40">
                                      <td className="py-1 pr-3">{fmt(p.created_at)}</td>
                                      <td className="py-1 pr-3 font-medium">{rupees(p.amount)}</td>
                                      <td className="py-1 pr-3">{p.productLabel}</td>
                                      <td className="py-1 pr-3">{p.status}{p.amount_refunded ? ` (refunded ${rupees(p.amount_refunded)})` : ""}</td>
                                      <td className="py-1 pr-3 font-mono text-[10px] text-muted-foreground">{p.id}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>

                          {r.member && (
                            <Link
                              href={`/admin/billing/lookup?q=${encodeURIComponent(r.member.email)}`}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              Open in Member Lookup <ExternalLink className="size-3" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.fix.label}</DialogTitle>
            <DialogDescription>
              {pending?.row.member?.name || pending?.row.member?.email}
              {pending?.row.member?.name && ` (${pending.row.member.email})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>{pending?.message}</p>
            <p className="text-xs text-muted-foreground">
              This changes their membership straight away and is recorded in the admin audit trail.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={applying}>
              Cancel
            </Button>
            <Button onClick={applyFix} disabled={applying}>
              {applying && <Loader2 className="mr-2 size-4 animate-spin" />}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
