"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  CalendarPlus,
  CreditCard,
  Download,
  Eye,
  Loader2,
  Mail,
  MoreHorizontal,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Pill, type Tone } from "@/components/admin/billing/ui"
import type { MemberRow } from "@/lib/admin/member-directory"

// ── Filters ────────────────────────────────────────────────────────────────

const DAY = 86_400_000

type Status = "all" | "active" | "expiring" | "expired" | "none"
type Filters = {
  q: string
  status: Status
  plan: string
  renew: "all" | MemberRow["autoRenew"]
  kr: "all" | "yes" | "no"
  login: "all" | "never" | "30d" | "inactive"
  role: "members" | "team" | "all"
}
const DEFAULT_FILTERS: Filters = {
  q: "",
  status: "all",
  plan: "all",
  renew: "all",
  kr: "all",
  login: "all",
  role: "members",
}

type SortKey = "name" | "plan" | "ends" | "login" | "joined"

const isTeam = (r: MemberRow) => r.role !== "member"
const daysLeft = (r: MemberRow, now: number) =>
  r.endsAt ? Math.ceil((new Date(r.endsAt).getTime() - now) / DAY) : null
const expiringSoon = (r: MemberRow, now: number) => {
  const d = daysLeft(r, now)
  return r.access === "active" && d !== null && d <= 7
}

function matches(r: MemberRow, f: Filters, now: number, skip?: keyof Filters) {
  if (skip !== "role" && f.role !== "all" && (f.role === "team") !== isTeam(r)) return false
  if (skip !== "q" && f.q) {
    const hay = [r.name, r.email, r.phone].filter(Boolean).join(" ").toLowerCase()
    if (!f.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false
  }
  if (skip !== "status" && f.status !== "all") {
    if (f.status === "expiring" ? !expiringSoon(r, now) : r.access !== f.status) return false
  }
  if (skip !== "plan" && f.plan !== "all" && (r.plan ?? "—") !== f.plan) return false
  if (skip !== "renew" && f.renew !== "all" && (r.access === "none" || r.autoRenew !== f.renew)) return false
  if (skip !== "kr" && f.kr !== "all" && r.krActive !== (f.kr === "yes")) return false
  if (skip !== "login" && f.login !== "all") {
    const last = r.lastSignIn ? new Date(r.lastSignIn).getTime() : null
    if (f.login === "never" && last !== null) return false
    if (f.login === "30d" && (last === null || now - last > 30 * DAY)) return false
    if (f.login === "inactive" && (last === null || now - last <= 30 * DAY)) return false
  }
  return true
}

// ── Formatting ─────────────────────────────────────────────────────────────

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—"

function ago(iso: string | null, now: number) {
  if (!iso) return null
  const d = Math.floor((now - new Date(iso).getTime()) / DAY)
  if (d <= 0) return "today"
  if (d === 1) return "yesterday"
  if (d < 30) return `${d} days ago`
  if (d < 365) return `${Math.floor(d / 30)} mo ago`
  return `${Math.floor(d / 365)} yr ago`
}

function accessPill(r: MemberRow, now: number): { tone: Tone; label: string } {
  if (r.access === "none") return { tone: "neutral", label: "No membership" }
  if (r.access === "expired") return { tone: "bad", label: "Expired" }
  if (expiringSoon(r, now)) return { tone: "warn", label: "Ending soon" }
  return { tone: "good", label: "Active" }
}

const RENEW_LABEL: Record<MemberRow["autoRenew"], string> = {
  on: "Autopay on",
  cancelled: "Autopay cancelled",
  manual: "No autopay",
}

// ── Component ──────────────────────────────────────────────────────────────

const PAGE = 50

export function MemberDirectory({ rows, isAdmin }: { rows: MemberRow[]; isAdmin: boolean }) {
  const router = useRouter()
  // Fixed for the life of the page so counts and filters agree with each other.
  const [now] = useState(() => Date.now())
  const [f, setF] = useState<Filters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "joined", dir: -1 })
  const [shown, setShown] = useState(PAGE)

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setF((prev) => ({ ...prev, [key]: value }))
    setShown(PAGE)
  }

  const plans = useMemo(
    () => [...new Set(rows.map((r) => r.plan ?? "—"))].sort((a, b) => a.localeCompare(b)),
    [rows],
  )

  const filtered = useMemo(() => {
    const out = rows.filter((r) => matches(r, f, now))
    const val = (r: MemberRow): string | number => {
      switch (sort.key) {
        case "name":
          return r.name.toLowerCase()
        case "plan":
          return (r.plan ?? "").toLowerCase()
        case "ends":
          return r.endsAt ? new Date(r.endsAt).getTime() : -Infinity
        case "login":
          return r.lastSignIn ? new Date(r.lastSignIn).getTime() : -Infinity
        case "joined":
          return new Date(r.joinedAt).getTime()
      }
    }
    return out.sort((a, b) => {
      const x = val(a)
      const y = val(b)
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir
    })
  }, [rows, f, sort, now])

  // Counts for the status cards respect every other filter, so they always
  // add up to what the table would show.
  const statusCounts = useMemo(() => {
    const base = rows.filter((r) => matches(r, f, now, "status"))
    return {
      all: base.length,
      active: base.filter((r) => r.access === "active").length,
      expiring: base.filter((r) => expiringSoon(r, now)).length,
      expired: base.filter((r) => r.access === "expired").length,
      none: base.filter((r) => r.access === "none").length,
    }
  }, [rows, f, now])

  const activeFilterCount = (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).filter(
    (k) => f[k] !== DEFAULT_FILTERS[k],
  ).length

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" || key === "plan" ? 1 : -1 }))
  }

  function exportCsv() {
    const head = ["Name", "Email", "Phone", "Plan", "Status", "Ends", "Autopay", "Locked ₹/month", "Karma Recode until", "Last login", "Joined"]
    const lines = filtered.map((r) =>
      [
        r.name,
        r.email ?? "",
        r.phone ?? "",
        r.plan ?? "",
        accessPill(r, now).label,
        r.endsAt?.slice(0, 10) ?? "",
        r.access === "none" ? "" : RENEW_LABEL[r.autoRenew],
        r.lockedPrice ?? "",
        r.krUntil?.slice(0, 10) ?? "",
        r.lastSignIn?.slice(0, 10) ?? "",
        r.joinedAt.slice(0, 10),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    )
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `members-${new Date(now).toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const cards: { key: Status; label: string; tone: Tone }[] = [
    { key: "all", label: "All", tone: "brand" },
    { key: "active", label: "Active", tone: "good" },
    { key: "expiring", label: "Ending in 7 days", tone: "warn" },
    { key: "expired", label: "Expired", tone: "bad" },
    { key: "none", label: "No membership", tone: "neutral" },
  ]

  return (
    <div className="space-y-4">
      {/* Status cards double as the main filter */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const on = f.status === c.key
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => set("status", c.key)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                on ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60 bg-card hover:bg-muted/40"
              }`}
            >
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{statusCounts[c.key]}</div>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border border-border/60 bg-card">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={f.q}
              onChange={(e) => set("q", e.target.value)}
              placeholder="Search name, email or phone"
              className="h-9 pl-9"
            />
          </div>

          <FilterSelect
            label="Plan"
            value={f.plan}
            onChange={(v) => set("plan", v)}
            options={[["all", "All plans"], ...plans.map((p) => [p, p === "—" ? "No plan" : p] as [string, string])]}
          />
          <FilterSelect
            label="Autopay"
            value={f.renew}
            onChange={(v) => set("renew", v as Filters["renew"])}
            options={[
              ["all", "Any autopay"],
              ["on", "Autopay on"],
              ["cancelled", "Autopay cancelled"],
              ["manual", "No autopay"],
            ]}
          />
          <FilterSelect
            label="Karma Recode"
            value={f.kr}
            onChange={(v) => set("kr", v as Filters["kr"])}
            options={[
              ["all", "Karma Recode: any"],
              ["yes", "Karma Recode only"],
              ["no", "Not Karma Recode"],
            ]}
          />
          <FilterSelect
            label="Login"
            value={f.login}
            onChange={(v) => set("login", v as Filters["login"])}
            options={[
              ["all", "Any login"],
              ["30d", "Logged in last 30 days"],
              ["inactive", "Not in 30+ days"],
              ["never", "Never logged in"],
            ]}
          />
          <FilterSelect
            label="Who"
            value={f.role}
            onChange={(v) => set("role", v as Filters["role"])}
            options={[
              ["members", "Members"],
              ["team", "Team accounts"],
              ["all", "Everyone"],
            ]}
          />

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => (setF(DEFAULT_FILTERS), setShown(PAGE))}>
              <X />
              Clear filters
            </Button>
          )}

          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download />
              Export
            </Button>
            {isAdmin && (
              <Button size="sm" asChild>
                <Link href="/admin/members/create">
                  <UserPlus />
                  Add member
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="px-4 py-2 text-xs text-muted-foreground">
          Showing {Math.min(shown, filtered.length)} of {filtered.length}
          {filtered.length !== rows.length && ` (out of ${rows.length} accounts)`}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y bg-muted/50 text-left">
                <SortTh label="Member" k="name" sort={sort} onSort={toggleSort} />
                <SortTh label="Plan" k="plan" sort={sort} onSort={toggleSort} />
                <SortTh label="Access" k="ends" sort={sort} onSort={toggleSort} />
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Karma Recode</th>
                <SortTh label="Last login" k="login" sort={sort} onSort={toggleSort} />
                <SortTh label="Joined" k="joined" sort={sort} onSort={toggleSort} />
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.slice(0, shown).map((r) => {
                const pill = accessPill(r, now)
                const left = daysLeft(r, now)
                return (
                  <tr key={r.profileId} className="align-top transition-colors hover:bg-muted/30">
                    <td className="max-w-[280px] px-4 py-3">
                      <Link href={`/admin/members/${r.profileId}`} className="block truncate font-medium hover:text-primary hover:underline">
                        {r.name}
                      </Link>
                      <div className="truncate text-xs text-muted-foreground">{r.email ?? "no email"}</div>
                      {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
                      {isTeam(r) && (
                        <span className="mt-1 inline-block">
                          <Pill tone="brand">{r.role.replace("_", " ")}</Pill>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="whitespace-nowrap">{r.plan ?? <span className="text-muted-foreground">—</span>}</div>
                      {r.access !== "none" && (
                        <div className="whitespace-nowrap text-xs text-muted-foreground">
                          {RENEW_LABEL[r.autoRenew]}
                          {r.lockedPrice ? ` · ₹${r.lockedPrice.toLocaleString("en-IN")}/mo` : ""}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Pill tone={pill.tone}>{pill.label}</Pill>
                      {r.endsAt && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {r.access === "active" ? "until" : "ended"} {fmt(r.endsAt)}
                          {r.access === "active" && left !== null && left <= 30 && ` · ${left}d left`}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {r.krUntil ? (
                        <>
                          <Pill tone={r.krActive ? "brand" : "neutral"}>{r.krActive ? "Member" : "Ended"}</Pill>
                          <div className="mt-1 text-muted-foreground">until {fmt(r.krUntil)}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {r.lastSignIn ? (
                        <>
                          <div>{ago(r.lastSignIn, now)}</div>
                          <div className="text-muted-foreground">{fmt(r.lastSignIn)}</div>
                        </>
                      ) : (
                        <span className="font-medium text-amber-700 dark:text-amber-300">Never</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmt(r.joinedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <RowActions row={r} isAdmin={isAdmin} onDone={() => router.refresh()} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nobody matches these filters.
            {activeFilterCount > 0 && (
              <Button variant="link" size="sm" onClick={() => setF(DEFAULT_FILTERS)}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {filtered.length > shown && (
          <div className="flex justify-center border-t p-3">
            <Button variant="outline" size="sm" onClick={() => setShown((n) => n + PAGE)}>
              Show {Math.min(PAGE, filtered.length - shown)} more
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Pieces ─────────────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: [string, string][]
  onChange: (v: string) => void
}) {
  const changed = value !== options[0][0] && !(label === "Who" && value === "members")
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 rounded-md border bg-background px-2.5 text-sm ${
        changed ? "border-primary text-primary" : "border-border"
      }`}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  )
}

function SortTh({
  label,
  k,
  sort,
  onSort,
}: {
  label: string
  k: SortKey
  sort: { key: SortKey; dir: 1 | -1 }
  onSort: (k: SortKey) => void
}) {
  const Icon = sort.key !== k ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown
  return (
    <th className="px-4 py-2.5">
      <button
        type="button"
        onClick={() => onSort(k)}
        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        {label}
        <Icon className={`size-3 ${sort.key === k ? "text-foreground" : "opacity-50"}`} />
      </button>
    </th>
  )
}

type Pending = null | "extend" | "revoke" | "remove"

function RowActions({ row, isAdmin, onDone }: { row: MemberRow; isAdmin: boolean; onDone: () => void }) {
  const [open, setOpen] = useState<Pending>(null)
  const [busy, setBusy] = useState(false)
  const [days, setDays] = useState("30")
  const [until, setUntil] = useState("")
  const [confirmText, setConfirmText] = useState("")

  async function call(url: string, method: string, body: object, ok: string) {
    setBusy(true)
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "That didn't work")
      toast.success(ok)
      setOpen(null)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't work")
    } finally {
      setBusy(false)
    }
  }

  const actionsUrl = `/api/admin/members/${row.profileId}/actions`

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${row.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{row.name}</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/admin/members/${row.profileId}`}>
              <Eye />
              View profile
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setOpen("extend")}>
                <CalendarPlus />
                Extend access
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!row.email}
                onSelect={() => call(actionsUrl, "POST", { action: "resend_login" }, `Login link sent to ${row.email}`)}
              >
                <Mail />
                Send login link
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/members/karma-recode">
                  <Sparkles />
                  {row.krUntil ? "Edit Karma Recode" : "Add to Karma Recode"}
                </Link>
              </DropdownMenuItem>
              {row.email && (
                <DropdownMenuItem asChild>
                  <Link href={`/admin/billing/lookup?q=${encodeURIComponent(row.email)}`}>
                    <CreditCard />
                    Payments &amp; billing
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={row.access !== "active"} onSelect={() => setOpen("revoke")}>
                <Ban />
                Stop access now
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => (setConfirmText(""), setOpen("remove"))}
              >
                <Trash2 />
                Delete account
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open !== null} onOpenChange={(o) => !o && !busy && setOpen(null)}>
        <DialogContent>
          {open === "extend" && (
            <>
              <DialogHeader>
                <DialogTitle>Extend access for {row.name}</DialogTitle>
                <DialogDescription>
                  {row.access === "active" ? `Currently until ${fmt(row.endsAt)}.` : "They have no active membership right now."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-left">
                <div className="flex flex-wrap gap-2">
                  {["7", "30", "90", "365"].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={!until && days === d ? "default" : "outline"}
                      onClick={() => (setDays(d), setUntil(""))}
                    >
                      +{d} days
                    </Button>
                  ))}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Or until a date</label>
                  <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  disabled={busy}
                  onClick={() =>
                    call(
                      actionsUrl,
                      "POST",
                      until ? { action: "extend_subscription", until } : { action: "extend_subscription", days: Number(days) },
                      until ? `Access extended until ${fmt(until)}` : `Access extended by ${days} days`,
                    )
                  }
                >
                  {busy && <Loader2 className="animate-spin" />}
                  Extend
                </Button>
              </DialogFooter>
            </>
          )}

          {open === "revoke" && (
            <>
              <DialogHeader>
                <DialogTitle>Stop access for {row.name}?</DialogTitle>
                <DialogDescription>
                  Their membership ends now and they lose access to the portal. Their account stays, and you can extend it
                  again later. This does not cancel a Razorpay autopay.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => call(actionsUrl, "POST", { action: "revoke_access" }, `Access stopped for ${row.name}`)}
                >
                  {busy && <Loader2 className="animate-spin" />}
                  Stop access
                </Button>
              </DialogFooter>
            </>
          )}

          {open === "remove" && (
            <>
              <DialogHeader>
                <DialogTitle>Delete {row.name}&apos;s account?</DialogTitle>
                <DialogDescription>
                  This permanently deletes their login, profile and history. It cannot be undone. To only cut off access,
                  use &ldquo;Stop access now&rdquo; instead.
                </DialogDescription>
              </DialogHeader>
              <div className="text-left">
                <label className="mb-1 block text-xs font-medium">Type DELETE to confirm</label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy || confirmText !== "DELETE"}
                  onClick={() =>
                    call(`/api/admin/members/${row.profileId}`, "PATCH", { action: "remove_member" }, `${row.name} deleted`)
                  }
                >
                  {busy && <Loader2 className="animate-spin" />}
                  Delete account
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
