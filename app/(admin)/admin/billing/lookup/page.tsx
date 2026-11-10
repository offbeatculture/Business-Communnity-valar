import Link from "next/link"
import { requireBillingAdmin } from "@/lib/billing/page-guard"
import { loadBillingData } from "@/lib/billing/data"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMemberActions } from "@/lib/admin-audit"
import { normalisePhone } from "@/lib/billing/razorpay-api"
import { CATEGORY_LABELS, FLAG_LABELS, fmt, rupees, type ReconRow } from "@/lib/billing/reconcile"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowRight, CreditCard, History, Receipt, Search, SearchX, Webhook } from "lucide-react"
import { DataTable, EmptyState, KeyValues, Mono, PageHeader, Panel, Pill } from "@/components/admin/billing/ui"

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
      <PageHeader
        title="Member Lookup"
        description="Everything about one person: memberships, Razorpay subscription and payments, webhook messages, and every admin change. Searching by phone finds people who paid with a different email."
      />

      <Panel>
        <form method="get" className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder="Email, name, phone, pay_… or sub_…" className="h-10 pl-9" autoFocus />
          </div>
          <Button type="submit" className="h-10 px-6">
            Search
          </Button>
        </form>
        {q && q.length < 3 && <p className="mt-2 text-sm text-muted-foreground">Type at least 3 characters.</p>}
      </Panel>

      {!q && (
        <Panel>
          <EmptyState icon={Search} title="Search for a member">
            Paste an email, a phone number, or a Razorpay <code>pay_</code> / <code>sub_</code> ID.
          </EmptyState>
        </Panel>
      )}

      {q.length >= 3 && results.length === 0 && (
        <Panel>
          <EmptyState icon={SearchX} title={`Nobody matches “${q}”`}>
            If they paid recently, press Sync now on the Reconciliation tab first.
          </EmptyState>
        </Panel>
      )}

      {results.length > 1 && <p className="text-sm text-muted-foreground">{results.length} people match.</p>}

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
  const name = m?.name || row.rzpSub?.customer_name || "No account"
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  const access = ACCESS[row.access]

  return (
    <div className="space-y-4">
      {/* Who they are */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{name}</h2>
              <p className="truncate text-sm text-muted-foreground">
                {m?.email ?? row.rzpSub?.email ?? "—"}
                {(m?.phone ?? row.rzpSub?.contact) && ` · ${m?.phone ?? row.rzpSub?.contact}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Pill tone={access.tone}>{access.label}</Pill>
                <Pill tone="brand">{CATEGORY_LABELS[row.category]}</Pill>
                {m?.role && m.role !== "member" && <Pill>{m.role}</Pill>}
              </div>
            </div>
          </div>
          {profile?.id && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/members/${profile.id}`}>
                Member page <ArrowRight />
              </Link>
            </Button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 text-sm md:grid-cols-4">
          <Fact label="Access ends" value={fmt(row.dbExpires)} />
          <Fact label="Razorpay paid until" value={fmt(row.rzpPaidUntil)} />
          <Fact label="Joined" value={fmt(m?.joinedAt)} />
          <Fact label="Last login" value={fmt(m?.lastSignIn)} />
        </div>

        {row.flags.length > 0 && (
          <ul className="mt-4 space-y-1.5 rounded-lg border bg-muted/30 p-3 text-sm">
            {row.flags.map((f) => (
              <li key={f.code} className="flex gap-2">
                <span className="shrink-0">
                  <Pill tone={f.severity === "high" ? "bad" : f.severity === "medium" ? "warn" : "neutral"}>{FLAG_LABELS[f.code]}</Pill>
                </span>
                <span className="text-muted-foreground">
                  {f.message}
                  {f.fix && " Fix it on the Reconciliation tab."}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel flush title="Memberships" description={`${memberships?.length ?? 0} on record`}>
          <DataTable
            emptyIcon={CreditCard}
            empty="No memberships."
            head={["Plan", "Amount", "Status", "Period"]}
            rows={(memberships ?? []).map((s) => [
              <div key="p">
                <div className="font-medium">{String(s.plan_label ?? "—")}</div>
                <div className="text-xs text-muted-foreground">{String(s.tier ?? "")} tier</div>
              </div>,
              <span key="a" className="tabular-nums">{rupees(s.amount_paid as number)}</span>,
              <Pill key="s" tone={s.status === "active" ? "good" : s.status === "expired" ? "neutral" : "warn"}>{String(s.status ?? "—")}</Pill>,
              <span key="d" className="whitespace-nowrap text-xs">
                {fmt(s.starts_at as string)} → {fmt(s.expires_at as string)}
              </span>,
            ])}
          />
        </Panel>

        <Panel title="Razorpay subscription">
          {row.rzpSub ? (
            <KeyValues
              items={[
                ["ID", <Mono key="id">{row.rzpSub.id}</Mono>],
                ["Status", <Pill key="s" tone={["active", "authenticated", "completed"].includes(row.rzpSub.status ?? "") ? "good" : "warn"}>{row.rzpSub.status ?? "unknown"}</Pill>],
                ["Payments made", String(row.rzpSub.paid_count ?? 0)],
                ["Current cycle", `${fmt(row.rzpSub.current_start)} → ${fmt(row.rzpSub.current_end)}`],
                ["Next charge", fmt(row.rzpSub.charge_at)],
              ]}
            />
          ) : (
            <EmptyState icon={CreditCard} title="No Lifinity subscription in Razorpay" />
          )}
        </Panel>
      </div>

      <Panel flush title="Payments" description={`${row.payments.length} found under this email or phone since 1 June`}>
        <DataTable
          emptyIcon={Receipt}
          empty="No Razorpay payments under this email or phone since 1 June."
          head={["Date", "Amount", "For", "Status", "Method", "Payment ID"]}
          rows={row.payments.map((p) => [
            <span key="d" className="whitespace-nowrap">{fmt(p.created_at)}</span>,
            <span key="a" className="font-medium tabular-nums">{rupees(p.amount)}</span>,
            p.productLabel,
            <Pill key="s" tone={p.status === "captured" ? (p.amount_refunded ? "warn" : "good") : "neutral"}>
              {p.amount_refunded ? `refunded ${rupees(p.amount_refunded)}` : p.status}
            </Pill>,
            <span key="m" className="text-muted-foreground">{p.method ?? "—"}</span>,
            <Mono key="i">{p.id}</Mono>,
          ])}
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel flush title="Webhook messages" description="What Razorpay told the site about them">
          <DataTable
            emptyIcon={Webhook}
            empty="No webhook messages for this person."
            head={["Received", "Event", "Outcome"]}
            rows={events.map((e) => [
              <span key="d" className="whitespace-nowrap">{fmt(e.created_at)}</span>,
              <div key="t">
                <Mono>{e.event_type}</Mono>
                {e.error && <div className="mt-0.5 text-xs text-muted-foreground">{e.error}</div>}
              </div>,
              <Pill
                key="o"
                tone={!e.outcome || e.outcome === "processed" ? "good" : e.outcome === "ignored" ? "warn" : "bad"}
              >
                {e.outcome ?? "recorded"}
              </Pill>,
            ])}
          />
        </Panel>

        <Panel flush title="Admin changes" description="Every change an admin made to them">
          <DataTable
            emptyIcon={History}
            empty="No admin changes recorded."
            head={["When", "Change", "By"]}
            rows={actions.map((a) => [
              <span key="d" className="whitespace-nowrap">{fmt(a.created_at as string)}</span>,
              String(a.action),
              <span key="b" className="text-muted-foreground">{String(a.admin_email ?? "—")}</span>,
            ])}
          />
        </Panel>
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  )
}

const ACCESS: Record<ReconRow["access"], { tone: "good" | "warn" | "neutral"; label: string }> = {
  active: { tone: "good", label: "Has access" },
  lapsed: { tone: "warn", label: "Lapsed" },
  none: { tone: "neutral", label: "No membership" },
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
