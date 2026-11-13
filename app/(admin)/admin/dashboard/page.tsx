import type { ElementType } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  IndianRupee,
  LifeBuoy,
  MessageSquare,
  Sparkles,
  UserPlus,
  Users,
  Video,
} from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadMemberDirectory, type MemberRow } from "@/lib/admin/member-directory"
import { Pill } from "@/components/admin/billing/ui"
import { RevenueMiniChart } from "@/components/admin/RevenueMiniChart"

export const dynamic = "force-dynamic"

const TZ = "Asia/Kolkata"
const IST_OFFSET = 330 * 60_000
const DAY = 86_400_000

type Period = "today" | "week" | "month"
const PERIODS: { value: Period; label: string; short: string }[] = [
  { value: "today", label: "Today", short: "today" },
  { value: "week", label: "This week", short: "this week" },
  { value: "month", label: "This month", short: "this month" },
]

/** Start of today / this week (Monday) / this month, in IST. */
function periodStart(period: Period, now: number) {
  const ist = new Date(now + IST_OFFSET)
  const y = ist.getUTCFullYear()
  const m = ist.getUTCMonth()
  const d = ist.getUTCDate()
  let start: number
  if (period === "month") start = Date.UTC(y, m, 1)
  else if (period === "week") start = Date.UTC(y, m, d - ((ist.getUTCDay() + 6) % 7))
  else start = Date.UTC(y, m, d)
  return start - IST_OFFSET
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ })
const inr = (rupees: number) => `₹${Math.round(rupees).toLocaleString("en-IN")}`

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range } = await searchParams
  const period: Period = range === "today" || range === "week" ? range : "month"
  const periodInfo = PERIODS.find((p) => p.value === period)!
  const now = new Date().getTime()
  const from = periodStart(period, now)
  const fromIso = new Date(from).toISOString()

  const admin = createAdminClient()
  const [rows, payments, syncedAny, support, recordings, recordingsNew, posts, postsNew, events, krList] = await Promise.all([
    loadMemberDirectory(),
    // Real Razorpay payments (sign-ups and autopay renewals), kept fresh by
    // Billing → Sync now and the webhook.
    admin.from("rzp_payments").select("amount, amount_refunded, created_at").eq("status", "captured").gte("created_at", fromIso),
    admin.from("rzp_payments").select("id", { count: "exact", head: true }),
    admin.from("support_queries").select("status"),
    admin.from("video_summaries").select("id", { count: "exact", head: true }),
    admin.from("video_summaries").select("id", { count: "exact", head: true }).gte("created_at", fromIso),
    admin.from("posts").select("id", { count: "exact", head: true }),
    admin.from("posts").select("id", { count: "exact", head: true }).gte("created_at", fromIso),
    admin
      .from("live_events")
      .select("id, title, starts_at")
      .gte("starts_at", new Date(now).toISOString())
      .order("starts_at")
      .limit(3),
    admin.from("karma_recode_members").select("email, expires_at"),
  ])

  // ── Members ────────────────────────────────────────────────────────────
  const members = rows.filter((r) => r.role === "member")
  const active = members.filter((r) => r.access === "active")
  const expired = members.filter((r) => r.access === "expired")
  const endsIn = (r: MemberRow) => (r.endsAt ? new Date(r.endsAt).getTime() - now : Infinity)
  const ending7 = active.filter((r) => endsIn(r) <= 7 * DAY)
  const joined = members.filter((r) => new Date(r.joinedAt).getTime() >= from)
  const neverLoggedIn = active.filter((r) => !r.lastSignIn)
  const autopayOn = active.filter((r) => r.autoRenew === "on").length
  const krActive = members.filter((r) => r.krActive).length
  const krEmails = new Set(rows.map((r) => r.email))
  const krNoAccount = (krList.data ?? []).filter(
    (k) => new Date(k.expires_at).getTime() > now && !krEmails.has(k.email),
  ).length

  // ── Money ──────────────────────────────────────────────────────────────
  const paid = (payments.data ?? []).map((p) => ({
    at: new Date(p.created_at).getTime(),
    rupees: ((p.amount ?? 0) - (p.amount_refunded ?? 0)) / 100,
  }))
  const synced = (syncedAny.count ?? 0) > 0
  const revenue = paid.reduce((s, p) => s + p.rupees, 0)
  const days = Math.max(1, Math.ceil((now - from) / DAY))
  const chart = Array.from({ length: days }, (_, i) => {
    const start = from + i * DAY
    return {
      date: fmtDate(new Date(start).toISOString()),
      revenue: Math.round(paid.filter((p) => p.at >= start && p.at < start + DAY).reduce((s, p) => s + p.rupees, 0)),
    }
  })

  // ── Support ────────────────────────────────────────────────────────────
  const openSupport = (support.data ?? []).filter((q) => {
    const s = q.status?.toLowerCase()
    return !s || s === "open" || s === "pending" || s === "in_progress"
  }).length

  const attention: { label: string; href: string; tone: "bad" | "warn" }[] = []
  if (ending7.length) attention.push({ label: `${ending7.length} memberships end in the next 7 days`, href: "/admin/members?status=expiring", tone: "warn" })
  if (openSupport) attention.push({ label: `${openSupport} support ${openSupport === 1 ? "query is" : "queries are"} waiting for a reply`, href: "/admin/support", tone: "bad" })
  if (neverLoggedIn.length) attention.push({ label: `${neverLoggedIn.length} active members have never logged in`, href: "/admin/members?status=active&login=never", tone: "warn" })
  if (krNoAccount) attention.push({ label: `${krNoAccount} Karma Recode ${krNoAccount === 1 ? "buyer has" : "buyers have"} no account yet`, href: "/admin/members/karma-recode", tone: "warn" })
  if (expired.length) attention.push({ label: `${expired.length} members have expired — check renewals`, href: "/admin/billing", tone: "warn" })

  const endingSoon = active
    .filter((r) => endsIn(r) <= 14 * DAY)
    .sort((a, b) => endsIn(a) - endsIn(b))
    .slice(0, 8)
  const recent = [...members].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)).slice(0, 8)

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(now).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: TZ })} IST
          </p>
        </div>
        <div className="flex rounded-lg border bg-card p-0.5 text-sm">
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={`/admin/dashboard?range=${p.value}`}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                p.value === period ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Users} label="Active members" value={active.length} sub={`of ${members.length} · ${autopayOn} on autopay`} href="/admin/members?status=active" />
        <Kpi icon={UserPlus} label={`Joined ${periodInfo.short}`} value={joined.length} sub="new accounts" href="/admin/members" />
        <Kpi icon={CalendarDays} label="Ending in 7 days" value={ending7.length} sub="renewals due" href="/admin/members?status=expiring" tone={ending7.length ? "warn" : undefined} />
        <Kpi icon={IndianRupee} label={`Revenue ${periodInfo.short}`} value={synced ? inr(revenue) : "—"} sub={synced ? `${paid.length} payments` : "run Billing → Sync now"} href="/admin/billing" />
        <Kpi icon={Sparkles} label="Karma Recode" value={krActive} sub="active members" href="/admin/members/karma-recode" />
        <Kpi icon={LifeBuoy} label="Open support" value={openSupport} sub="awaiting reply" href="/admin/support" tone={openSupport ? "bad" : undefined} />
      </div>

      {/* Attention + revenue */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Section title="Needs attention">
          {attention.length ? (
            <ul className="divide-y">
              {attention.map((a) => (
                <li key={a.label}>
                  <Link href={a.href} className="group flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40">
                    <AlertTriangle className={`size-4 shrink-0 ${a.tone === "bad" ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`} />
                    <span className="flex-1">{a.label}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Nothing needs attention right now.
            </p>
          )}
        </Section>

        <Section title={`Revenue ${periodInfo.short}`} right={synced ? <span className="text-sm font-semibold tabular-nums">{inr(revenue)}</span> : undefined}>
          {synced ? (
            <div className="px-3 pb-3 pt-1">
              <RevenueMiniChart data={chart} />
              <p className="px-1 text-xs text-muted-foreground">Captured Razorpay payments each day, sign-ups and autopay renewals, less refunds.</p>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Payments haven&apos;t been pulled from Razorpay yet.{" "}
              <Link href="/admin/billing" className="font-medium text-primary hover:underline">
                Open Billing and press Sync now
              </Link>
              .
            </div>
          )}
        </Section>
      </div>

      {/* Member lists */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Ending in the next 14 days" href="/admin/members?status=expiring">
          <MiniTable
            empty="No memberships end in the next 14 days."
            rows={endingSoon.map((r) => ({
              key: r.profileId,
              href: `/admin/members/${r.profileId}`,
              name: r.name,
              sub: r.plan ?? "—",
              right: fmtDate(r.endsAt!),
              pill: r.autoRenew === "on" ? <Pill tone="good">Autopay</Pill> : <Pill tone="warn">Manual</Pill>,
            }))}
          />
        </Section>

        <Section title="Recently joined" href="/admin/members">
          <MiniTable
            empty="No members yet."
            rows={recent.map((r) => ({
              key: r.profileId,
              href: `/admin/members/${r.profileId}`,
              name: r.name,
              sub: r.plan ?? "No membership",
              right: fmtDate(r.joinedAt),
              pill:
                r.access === "active" ? <Pill tone="good">Active</Pill> : r.access === "expired" ? <Pill tone="bad">Expired</Pill> : <Pill tone="neutral">None</Pill>,
            }))}
          />
        </Section>
      </div>

      {/* Content & community */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={Video} label="Recordings" value={recordings.count ?? 0} sub={`+${recordingsNew.count ?? 0} ${periodInfo.short}`} href="/admin/content" />
        <MiniStat icon={MessageSquare} label="Community posts" value={posts.count ?? 0} sub={`+${postsNew.count ?? 0} ${periodInfo.short}`} href="/community" />
        <MiniStat icon={Sparkles} label="Karma Recode content" value="Manage" sub="videos & folders" href="/admin/karma-recode" />
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <Link href="/admin/events" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground">
            <CalendarDays className="size-3.5" />
            Upcoming events
          </Link>
          {events.data?.length ? (
            <ul className="mt-1.5 space-y-0.5 text-sm">
              {events.data.map((e) => (
                <li key={e.id} className="flex justify-between gap-2">
                  <span className="truncate">{e.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(e.starts_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">None scheduled</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Pieces ─────────────────────────────────────────────────────────────────

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  href,
  tone,
}: {
  icon: ElementType
  label: string
  value: number | string
  sub: string
  href: string
  tone?: "warn" | "bad"
}) {
  const color = tone === "bad" ? "text-destructive" : tone === "warn" ? "text-amber-600 dark:text-amber-400" : ""
  return (
    <Link href={href} className="group rounded-xl border border-border/60 bg-card p-3.5 transition-colors hover:border-primary/50">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        {label}
        <Icon className="size-3.5" />
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </div>
      <div className="truncate text-xs text-muted-foreground">{sub}</div>
    </Link>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
  href,
}: {
  icon: ElementType
  label: string
  value: number | string
  sub: string
  href: string
}) {
  return (
    <Link href={href} className="rounded-xl border border-border/60 bg-card p-3 transition-colors hover:border-primary/50">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
    </Link>
  )
}

function Section({
  title,
  href,
  right,
  children,
}: {
  title: string
  href?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {right ??
          (href && (
            <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all
              <ArrowRight className="size-3" />
            </Link>
          ))}
      </div>
      {children}
    </section>
  )
}

function MiniTable({
  rows,
  empty,
}: {
  rows: { key: string; href: string; name: string; sub: string; right: string; pill: React.ReactNode }[]
  empty: string
}) {
  if (!rows.length) return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="divide-y">
      {rows.map((r) => (
        <li key={r.key}>
          <Link href={r.href} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/40">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.name}</div>
              <div className="truncate text-xs text-muted-foreground">{r.sub}</div>
            </div>
            {r.pill}
            <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{r.right}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
