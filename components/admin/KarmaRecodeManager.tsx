"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react"
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
import { EmptyState, Panel, Pill } from "@/components/admin/billing/ui"
import { karmaRecodeExpiry, karmaRecodeStart } from "@/lib/karma-recode-dates"

export type KrRow = {
  email: string
  name: string | null
  phone: string | null
  purchasedOn: string | null
  expiresAt: string
  active: boolean
  hasAccount: boolean
  lastSignIn: string | null
  membershipLabel: string | null
  membershipEnds: string | null
}

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—"

/** ISO timestamp → YYYY-MM-DD in IST, for a date input. */
const toDateInput = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })

type Form = { email: string; name: string; phone: string; purchasedOn: string; override: string }
const EMPTY: Form = { email: "", name: "", phone: "", purchasedOn: "", override: "" }

export function KarmaRecodeManager({ rows }: { rows: KrRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<"new" | KrRow | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => [r.email, r.name, r.phone].filter(Boolean).join(" ").toLowerCase().includes(q))
  }, [rows, query])

  function open(row: KrRow | "new") {
    setEditing(row)
    if (row === "new") setForm(EMPTY)
    else {
      const calculated = karmaRecodeExpiry(row.purchasedOn)
      setForm({
        email: row.email,
        name: row.name ?? "",
        phone: row.phone ?? "",
        purchasedOn: row.purchasedOn ?? "",
        // Show an override only if the saved date isn't the calculated one.
        override: row.expiresAt.slice(0, 10) === calculated.slice(0, 10) ? "" : toDateInput(row.expiresAt),
      })
    }
  }

  const calculatedEnd = karmaRecodeExpiry(form.purchasedOn || null)
  const endsOn = form.override || toDateInput(calculatedEnd)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/karma-recode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          name: form.name || null,
          phone: form.phone || null,
          purchasedOn: form.purchasedOn || null,
          expiresAt: form.override ? `${form.override}T23:59:59+05:30` : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't save")
      toast.success(
        data.hasAccount
          ? `Saved. Karma Recode and Lifinity until ${fmt(data.member.expires_at)}.`
          : "Saved. They'll get access as soon as an account exists for this email."
      )
      setEditing(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save")
    } finally {
      setSaving(false)
    }
  }

  async function remove(row: KrRow) {
    if (!window.confirm(`Remove ${row.name || row.email} from Karma Recode? They lose the Karma Recode tab straight away. Their Lifinity membership is not changed.`)) return
    setRemoving(row.email)
    try {
      const res = await fetch(`/api/admin/karma-recode?email=${encodeURIComponent(row.email)}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't remove")
      toast.success("Removed from Karma Recode")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove")
    } finally {
      setRemoving(null)
    }
  }

  return (
    <>
      <Panel
        flush
        title="Members"
        description={`Showing ${visible.length} of ${rows.length}`}
        actions={
          <>
            <div className="relative w-64 max-w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, email or phone" className="h-9 pl-9" />
            </div>
            <Button size="sm" onClick={() => open("new")}>
              <Plus />
              Add member
            </Button>
          </>
        }
      >
        {visible.length === 0 ? (
          <EmptyState icon={Sparkles} title={rows.length ? "Nobody matches" : "No Karma Recode members yet"}>
            {rows.length ? undefined : "Press Add member, or load the list with the SQL from the migration notes."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  {["Member", "Bought", "Karma Recode access", "Account", "Lifinity membership", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((r) => {
                  const lifinityShort =
                    r.hasAccount && (!r.membershipEnds || new Date(r.membershipEnds).getTime() < new Date(r.expiresAt).getTime() - 86400000)
                  return (
                    <tr key={r.email} className="align-top transition-colors hover:bg-muted/30">
                      <td className="max-w-[260px] px-4 py-3">
                        <div className="truncate font-medium">{r.name || "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                        {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {r.purchasedOn ? fmt(r.purchasedOn) : <span className="text-muted-foreground">Not known</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Pill tone={r.active ? "good" : "neutral"}>{r.active ? "Active" : "Ended"}</Pill>
                        <div className="mt-1 text-xs text-muted-foreground">until {fmt(r.expiresAt)}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {r.hasAccount ? (
                          <>
                            <Pill tone="good">Has account</Pill>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {r.lastSignIn ? `last login ${fmt(r.lastSignIn)}` : "never logged in"}
                            </div>
                          </>
                        ) : (
                          <Pill tone="bad">No account</Pill>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {!r.hasAccount ? (
                          <span className="text-muted-foreground">—</span>
                        ) : r.membershipEnds ? (
                          <>
                            <div className={lifinityShort ? "font-medium text-amber-700 dark:text-amber-300" : ""}>
                              until {fmt(r.membershipEnds)}
                            </div>
                            <div className="text-muted-foreground">{r.membershipLabel}</div>
                          </>
                        ) : (
                          <span className="font-medium text-amber-700 dark:text-amber-300">No active membership</span>
                        )}
                        {lifinityShort && r.active && (
                          <div className="mt-1 text-muted-foreground">Press Edit → Save to match it</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="xs" variant="outline" onClick={() => open(r)}>
                            <Pencil />
                            Edit
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={removing === r.email}
                            onClick={() => remove(r)}
                            aria-label={`Remove ${r.email}`}
                          >
                            {removing === r.email ? <Loader2 className="animate-spin" /> : <Trash2 />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add Karma Recode member" : "Edit Karma Recode member"}</DialogTitle>
            <DialogDescription>
              They get Lifinity plus the Karma Recode tab for a year from purchase. Purchases before 1 June 2026 count
              from 1 June 2026.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                disabled={editing !== "new"}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="the email they log in with"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
            </div>
            <Field label="Date they bought Karma Recode">
              <Input type="date" value={form.purchasedOn} onChange={(e) => setForm({ ...form, purchasedOn: e.target.value })} />
            </Field>

            <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm">
              Access counts from <strong>{fmt(karmaRecodeStart(form.purchasedOn || null))}</strong> and ends{" "}
              <strong>{fmt(form.override || calculatedEnd)}</strong>
              {form.override && " (set by hand)"}.
            </div>

            <Field label="Different end date (optional)">
              <div className="flex gap-2">
                <Input type="date" value={form.override} onChange={(e) => setForm({ ...form, override: e.target.value })} />
                {form.override && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, override: "" })}>
                    Use calculated
                  </Button>
                )}
              </div>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form.email.includes("@") || !endsOn}>
              {saving && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  )
}
