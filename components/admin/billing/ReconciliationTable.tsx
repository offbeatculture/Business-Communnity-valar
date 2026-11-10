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
import { CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Loader2, Search, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmptyState, KeyValues, Mono, Panel, Pill, TONE_TEXT, type Tone } from "@/components/admin/billing/ui"
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

const SEVERITY_TONE: Record<Severity, Tone> = {
  high: "bad",
  medium: "warn",
  low: "neutral",
  info: "neutral",
}

const ACCESS_PILL: Record<ReconRow["access"], { tone: Tone; label: string }> = {
  active: { tone: "good", label: "Active" },
  lapsed: { tone: "warn", label: "Lapsed" },
  none: { tone: "neutral", label: "No access" },
}

function rzpTone(status: string | null): Tone {
  if (!status) return "neutral"
  if (["active", "authenticated", "completed"].includes(status)) return "good"
  if (["pending", "halted", "paused"].includes(status)) return "warn"
  return "neutral"
}

/** Issue filters, grouped by how urgent they are. */
const GROUPS: { title: string; tone: Tone; codes: FlagCode[] }[] = [
  { title: "Fix now", tone: "bad", codes: ["paid_not_recorded", "setup_unfinished", "tier_restricted", "paid_no_account", "no_payment"] },
  { title: "Review", tone: "warn", codes: ["amount_mismatch", "staff_without_lifetime", "rzp_ended", "unlinked_payment"] },
  { title: "For information", tone: "neutral", codes: ["using_after_expiry", "other_product_only"] },
]

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

  const toggle = (key: string) =>
    setOpen((cur) => {
      const next = new Set(cur)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const chip = (id: Filter, label: string, count: number, tone: Tone = "brand") => (
    <button
      key={id}
      type="button"
      onClick={() => setFilter(id)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        filter === id
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {label}
      <span className={cn("tabular-nums", count && tone !== "brand" ? TONE_TEXT[tone] : "")}>{count}</span>
    </button>
  )

  return (
    <div className="space-y-6">
      <Panel
        flush
        title="Members"
        description={`Showing ${visible.length} of ${rows.length}. Click a row to see the full payment history.`}
        actions={
          <div className="relative w-72 max-w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, email, phone, pay_… or sub_…"
              className="h-9 pl-9"
            />
          </div>
        }
      >
        {/* Filters */}
        <div className="space-y-3 border-b bg-muted/30 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {chip("attention", "Needs attention", attentionCount)}
            {chip("all", "Everyone", rows.length)}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {GROUPS.map((g) => {
              const codes = g.codes.filter((c) => flagCounts.get(c))
              return (
                <div key={g.title}>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span className={cn("size-1.5 rounded-full", g.tone === "bad" ? "bg-destructive" : g.tone === "warn" ? "bg-amber-500" : "bg-muted-foreground/50")} />
                    {g.title}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {codes.length ? (
                      codes.map((c) => chip(c, FLAG_LABELS[c], flagCounts.get(c) ?? 0, g.tone))
                    ) : (
                      <span className="text-xs text-muted-foreground">Nothing here</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nothing to show">
            {filter === "attention" ? "Everything that needs attention has been dealt with." : "No one matches this filter."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="w-8 px-3 py-2.5" />
                  {["Member", "Membership", "Razorpay", "Issues", "Action"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((r) => {
                  const isOpen = open.has(r.key)
                  const access = ACCESS_PILL[r.access]
                  const fixes = r.flags.filter((f) => f.fix)
                  return (
                    <Fragment key={r.key}>
                      <tr
                        className={cn("cursor-pointer align-top transition-colors hover:bg-muted/30", isOpen && "bg-muted/30")}
                        onClick={() => toggle(r.key)}
                      >
                        <td className="px-3 py-3.5 text-muted-foreground">
                          {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </td>
                        <td className="max-w-[240px] px-4 py-3">
                          <div className="truncate font-medium">{r.member?.name || r.rzpSub?.customer_name || "—"}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {r.member?.email ?? r.rzpSub?.email ?? "no account"}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{CATEGORY_LABELS[r.category]}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Pill tone={access.tone}>{access.label}</Pill>
                            {r.dbSub && <span className="text-xs tabular-nums">{rupees(r.dbSub.amount_paid)}</span>}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {r.dbExpires ? `Ends ${fmt(r.dbExpires)}` : "No membership"}
                            {r.dbSub?.tier && r.dbSub.tier !== "membership" && ` · ${r.dbSub.tier} tier`}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {r.rzpSub ? (
                            <Pill tone={rzpTone(r.rzpSub.status)}>{r.rzpSub.status ?? "unknown"}</Pill>
                          ) : (
                            <span className="text-xs text-muted-foreground">No subscription</span>
                          )}
                          <div className="mt-1 text-xs text-muted-foreground">
                            {r.rzpPaidUntil
                              ? `Paid until ${fmt(r.rzpPaidUntil)}`
                              : r.lastLifinityPayment
                                ? `Last paid ${fmt(r.lastLifinityPayment.created_at)}`
                                : "No Lifinity payment"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {r.flags.length === 0 ? (
                            <Pill tone="good">Matches</Pill>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {r.flags.map((f) => (
                                <Pill key={f.code} tone={SEVERITY_TONE[f.severity]} title={f.message}>
                                  {FLAG_LABELS[f.code]}
                                </Pill>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-start gap-1.5">
                            {fixes.map((f) => (
                              <Button
                                key={f.code}
                                size="xs"
                                variant="outline"
                                onClick={() => setPending({ row: r, fix: f.fix!, message: f.message })}
                              >
                                <Wrench />
                                {f.fix!.label}
                              </Button>
                            ))}
                            {!fixes.length && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-muted/20">
                          <td />
                          <td colSpan={5} className="px-4 pb-5 pt-1">
                            <RowDetail row={r} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

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

function RowDetail({ row: r }: { row: ReconRow }) {
  return (
    <div className="space-y-4">
      {r.flags.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border bg-card p-3 text-sm">
          {r.flags.map((f) => (
            <li key={f.code} className="flex gap-2">
              <span className="shrink-0">
                <Pill tone={SEVERITY_TONE[f.severity]}>{FLAG_LABELS[f.code]}</Pill>
              </span>
              <span className="text-muted-foreground">{f.message}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">In the database</p>
          {r.dbSub ? (
            <KeyValues
              items={[
                ["Plan", r.dbSub.plan_label ?? r.dbSub.plan_name ?? "—"],
                ["Amount", `${rupees(r.dbSub.amount_paid)} · ${r.dbSub.tier} tier · ${r.dbSub.status}`],
                ["Period", `${fmt(r.dbSub.starts_at)} → ${fmt(r.dbSub.expires_at)}`],
                ["Razorpay ID", <Mono key="id">{r.dbSub.razorpay_subscription_id ?? r.dbSub.razorpay_payment_id ?? "none"}</Mono>],
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No membership record.</p>
          )}
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">In Razorpay</p>
          {r.rzpSub ? (
            <KeyValues
              items={[
                ["Subscription", <Mono key="id">{r.rzpSub.id}</Mono>],
                ["Status", `${r.rzpSub.status} · ${r.rzpSub.paid_count ?? 0} paid`],
                ["Current cycle", `${fmt(r.rzpSub.current_start)} → ${fmt(r.rzpSub.current_end)}`],
                ["Next charge", fmt(r.rzpSub.charge_at)],
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No Lifinity subscription.</p>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <p className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Payments ({r.payments.length})
        </p>
        {r.payments.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">No Razorpay payments under this email or phone since 1 June.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {r.payments.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap px-4 py-2">{fmt(p.created_at)}</td>
                  <td className="px-4 py-2 font-medium tabular-nums">{rupees(p.amount)}</td>
                  <td className="px-4 py-2">{p.productLabel}</td>
                  <td className="px-4 py-2">
                    <Pill tone={p.status === "captured" ? (p.amount_refunded ? "warn" : "good") : "neutral"}>
                      {p.amount_refunded ? `refunded ${rupees(p.amount_refunded)}` : p.status}
                    </Pill>
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    <Mono>{p.id}</Mono>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {r.member && (
        <Link
          href={`/admin/billing/lookup?q=${encodeURIComponent(r.member.email)}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Open everything about this person <ExternalLink className="size-3.5" />
        </Link>
      )}
    </div>
  )
}
