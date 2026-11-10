import Link from "next/link"
import { requireBillingAdmin } from "@/lib/billing/page-guard"
import { loadBillingData } from "@/lib/billing/data"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMemberActions } from "@/lib/admin-audit"
import { normalisePhone } from "@/lib/billing/razorpay-api"
import { CATEGORY_LABELS, FLAG_LABELS, fmt, rupees, type ReconRow } from "@/lib/billing/reconcile"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export const dynamic = "force-dynamic"

type Props = { searchParams: Promise<{ q?: string }> }

function matches(row: ReconRow, q: string) {
  const phone = normalisePhone(q)
  const m = row.member
  const hay = [
    m?.email,
    m?.name?.toLowerCase(),
    row.rzpSub?.email,
    row.rzpSub?.id.toLowerCase(),
    row.dbSub?.razorpay_subscription_id?.toLowerCase(),
    row.dbSub?.razorpay_payment_id?.toLowerCase(),
    ...row.payments.map((p) => p.id.toLowerCase()),
  ].filter(Boolean) as string[]
  if (hay.some((h) => h.includes(q))) return true
  return !!phone && (m?.phone === phone || row.rzpSub?.contact === phone || row.payments.some((p) => p.contact === phone))
}

export default async function BillingLookupPage({ searchParams }: Props) {
  await requireBillingAdmin()
  const q = ((await searchParams).q ?? "").trim().toLowerCase()

  let results: ReconRow[] = []
  if (q.length >= 3) {
    const { rows } = await loadBillingData()
    results = rows.filter((r) => matches(r, q)).slice(0, 10)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Billing</p>
        <h1 className="mt-1 text-2xl font-bold">Member Lookup</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Everything about one person: their memberships, Razorpay subscription and payments, the webhook events
          about them, and every change an admin has made. Phone search finds people who paid under a different email.
        </p>
      </div>

      <form method="get" className="flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Email, name, phone, pay_… or sub_…" className="pl-9" autoFocus />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {q && q.length < 3 && <p className="text-sm text-muted-foreground">Type at least 3 characters.</p>}
      {q.length >= 3 && results.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nobody matches “{q}”. If they paid recently, press Sync now on the Reconciliation page first.
        </p>
      )}

      {results.map((r) => (
        <PersonCard key={r.key} row={r} />
      ))}
    </div>
  )
}

async function PersonCard({ row }: { row: ReconRow }) {
  const admin = createAdminClient()
  const userId = row.member?.userId

  const [{ data: memberships }, actions, events, { data: profile }] = await Promise.all([
    userId
      ? admin
          .from("subscriptions")
          .select("id, plan_label, tier, amount_paid, status, starts_at, expires_at, razorpay_subscription_id, razorpay_payment_id, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    userId ? fetchMemberActions(userId, 15) : Promise.resolve([]),
    loadEvents(row),
    // The member page is keyed by profile id, not user id.
    userId
      ? admin.from("profiles").select("id").eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null as { id: string } | null }),
  ])

  const m = row.member
  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{m?.name || row.rzpSub?.customer_name || "No account"}</h2>
          <p className="text-sm text-muted-foreground">
            {m?.email ?? row.rzpSub?.email ?? "—"}
            {(m?.phone ?? row.rzpSub?.contact) && ` · ${m?.phone ?? row.rzpSub?.contact}`}
          </p>
          {m && (
            <p className="mt-1 text-xs text-muted-foreground">
              {m.role ?? "member"} · joined {fmt(m.joinedAt)} · last login {fmt(m.lastSignIn)}
            </p>
          )}
        </div>
        <div className="text-right text-sm">
          <div className="font-medium">{CATEGORY_LABELS[row.category]}</div>
          <div className="text-xs text-muted-foreground">
            Access: {row.access} {row.dbExpires && `· ends ${fmt(row.dbExpires)}`}
          </div>
          {profile?.id && (
            <Link href={`/admin/members/${profile.id}`} className="text-xs text-primary hover:underline">
              Member page →
            </Link>
          )}
        </div>
      </div>

      {row.flags.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm">
          {row.flags.map((f) => (
            <li key={f.code}>
              <span className="font-medium">{FLAG_LABELS[f.code]}:</span> {f.message}
              {f.fix && <span className="text-muted-foreground"> — fix on the Reconciliation page</span>}
            </li>
          ))}
        </ul>
      )}

      <Section title={`Memberships (${memberships?.length ?? 0})`}>
        <SimpleTable
          head={["Plan", "Amount", "Tier", "Status", "Period", "Razorpay link"]}
          rows={(memberships ?? []).map((s) => [
            String(s.plan_label ?? "—"),
            rupees(s.amount_paid as number),
            String(s.tier ?? "—"),
            String(s.status ?? "—"),
            `${fmt(s.starts_at as string)} → ${fmt(s.expires_at as string)}`,
            String(s.razorpay_subscription_id ?? s.razorpay_payment_id ?? "—"),
          ])}
          empty="No memberships."
        />
      </Section>

      <Section title="Razorpay subscription">
        {row.rzpSub ? (
          <p className="text-sm">
            <span className="font-mono text-xs">{row.rzpSub.id}</span> · {row.rzpSub.status} · {row.rzpSub.paid_count ?? 0}{" "}
            paid · cycle {fmt(row.rzpSub.current_start)} → {fmt(row.rzpSub.current_end)} · next charge {fmt(row.rzpSub.charge_at)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No Lifinity subscription in Razorpay.</p>
        )}
      </Section>

      <Section title={`Payments (${row.payments.length})`}>
        <SimpleTable
          head={["Date", "Amount", "What", "Status", "Method", "Payment ID"]}
          rows={row.payments.map((p) => [
            fmt(p.created_at),
            rupees(p.amount),
            p.productLabel,
            p.status + (p.amount_refunded ? ` (refunded ${rupees(p.amount_refunded)})` : ""),
            p.method ?? "—",
            p.id,
          ])}
          empty="No Razorpay payments under this email or phone since 1 June."
        />
      </Section>

      <Section title={`Webhook events (${events.length})`}>
        <SimpleTable
          head={["Received", "Event", "Outcome", "Detail"]}
          rows={events.map((e) => [
            fmt(e.created_at),
            e.event_type,
            e.outcome ?? "recorded",
            e.error ?? "",
          ])}
          empty="No webhook events found for this person."
        />
      </Section>

      <Section title={`Admin changes (${actions.length})`}>
        <SimpleTable
          head={["When", "Action", "By"]}
          rows={actions.map((a) => [
            fmt(a.created_at as string),
            String(a.action),
            String(a.admin_email ?? "—"),
          ])}
          empty="No admin changes recorded."
        />
      </Section>
    </div>
  )
}

async function loadEvents(row: ReconRow) {
  const admin = createAdminClient()
  const ids = [
    row.rzpSub?.id,
    row.dbSub?.razorpay_subscription_id,
    row.dbSub?.razorpay_payment_id,
    ...row.payments.map((p) => p.id),
  ].filter((x): x is string => !!x && /^(pay|sub)_[A-Za-z0-9]+$/.test(x))
  const unique = [...new Set(ids)]
  if (!unique.length) return []

  const list = unique.join(",")
  // entity_id is only set on events since outcomes were tracked; older events
  // carry the ids inside the payload.
  const { data } = await admin
    .from("webhook_events")
    .select("created_at, event_type, outcome, error")
    .or(
      `entity_id.in.(${list}),payload->payload->payment->entity->>id.in.(${list}),payload->payload->subscription->entity->>id.in.(${list})`
    )
    .order("created_at", { ascending: false })
    .limit(30)
  return (data ?? []) as { created_at: string; event_type: string; outcome: string | null; error: string | null }[]
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function SimpleTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="py-1 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border/40">
              {r.map((c, j) => (
                <td key={j} className="py-1 pr-3">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
