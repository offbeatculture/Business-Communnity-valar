import Link from "next/link"
import { requireBillingAdmin } from "@/lib/billing/page-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { fmt } from "@/lib/billing/reconcile"
import { Activity, CircleAlert, Inbox, Info, Repeat, Users } from "lucide-react"
import { Callout, DataTable, Mono, PageHeader, Panel, Pill, StatCard, StatGrid, TONE_TEXT, type Tone } from "@/components/admin/billing/ui"

export const dynamic = "force-dynamic"

type Props = { searchParams: Promise<{ outcome?: string }> }

type Ev = {
  created_at: string
  event_type: string
  outcome: string | null
  error: string | null
  plan_id: string | null
  entity_id: string | null
}

const OUTCOMES = ["processed", "failed", "ignored", "rejected"] as const
const OUTCOME_TONE: Record<string, Tone> = {
  processed: "good",
  recorded: "good",
  failed: "bad",
  rejected: "bad",
  ignored: "warn",
}

const DAY = 24 * 3600 * 1000

export default async function BillingWebhooksPage({ searchParams }: Props) {
  await requireBillingAdmin()
  const outcomeFilter = (await searchParams).outcome
  // One clock reading per request, so every check agrees on "now".
  const nowMs = new Date().getTime()
  const admin = createAdminClient()

  const since = new Date(nowMs - 30 * DAY).toISOString()

  const [recentRes, lastRenewalRes, lastAnyRes, plansRes, liveSubsRes, listRes] = await Promise.all([
    admin
      .from("webhook_events")
      .select("created_at, event_type, outcome, error, plan_id, entity_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10000),
    // Renewals that were accepted — before outcomes were tracked these have a
    // null outcome, which still means "processed".
    admin
      .from("webhook_events")
      .select("created_at")
      .eq("event_type", "subscription.charged")
      .or("outcome.is.null,outcome.eq.processed")
      .order("created_at", { ascending: false })
      .limit(1),
    admin.from("webhook_events").select("created_at").order("created_at", { ascending: false }).limit(1),
    admin.from("rzp_plans").select("id, name, is_lifinity"),
    admin.from("rzp_subscriptions").select("id, plan_id, status").in("status", ["active", "authenticated", "pending"]),
    (() => {
      let q = admin
        .from("webhook_events")
        .select("created_at, event_type, outcome, error, plan_id, entity_id")
        .order("created_at", { ascending: false })
        .limit(150)
      if (outcomeFilter && (OUTCOMES as readonly string[]).includes(outcomeFilter)) q = q.eq("outcome", outcomeFilter)
      return q
    })(),
  ])

  const recent = (recentRes.data ?? []) as Ev[]
  const lastRenewal = lastRenewalRes.data?.[0]?.created_at ?? null
  const lastAny = lastAnyRes.data?.[0]?.created_at ?? null
  const plans = new Map((plansRes.data ?? []).map((p) => [p.id as string, p as { id: string; name: string; is_lifinity: boolean }]))
  const liveLifinitySubs = (liveSubsRes.data ?? []).filter((s) => plans.get(s.plan_id as string)?.is_lifinity).length
  const list = (listRes.data ?? []) as Ev[]

  // ── Summaries ───────────────────────────────────────────────────────────
  const byOutcome = new Map<string, number>()
  const byType = new Map<string, { total: number; processed: number; ignored: number; failed: number; last: string }>()
  const ignoredPlans = new Map<string, number>()
  for (const e of recent) {
    const o = e.outcome ?? "recorded"
    byOutcome.set(o, (byOutcome.get(o) ?? 0) + 1)
    const t = byType.get(e.event_type) ?? { total: 0, processed: 0, ignored: 0, failed: 0, last: e.created_at }
    t.total += 1
    if (o === "processed" || o === "recorded") t.processed += 1
    if (o === "ignored") t.ignored += 1
    if (o === "failed" || o === "rejected") t.failed += 1
    byType.set(e.event_type, t)
    if (o === "ignored" && e.plan_id) ignoredPlans.set(e.plan_id, (ignoredPlans.get(e.plan_id) ?? 0) + 1)
  }

  // ── Alerts, in plain words ──────────────────────────────────────────────
  const alerts: { level: "red" | "amber"; text: string }[] = []
  const daysSinceRenewal = lastRenewal ? Math.floor((nowMs - new Date(lastRenewal).getTime()) / DAY) : null
  if (liveLifinitySubs > 0 && (daysSinceRenewal === null || daysSinceRenewal > 35)) {
    alerts.push({
      level: "red",
      text: `No renewal has been recorded ${lastRenewal ? `since ${fmt(lastRenewal)} (${daysSinceRenewal} days)` : "ever"}, but ${liveLifinitySubs} Lifinity subscription${liveLifinitySubs === 1 ? " is" : "s are"} live in Razorpay. Members who pay will look expired.`,
    })
  }
  for (const [planId, n] of ignoredPlans) {
    const plan = plans.get(planId)
    if (plan?.is_lifinity) {
      alerts.push({
        level: "red",
        text: `${n} event${n === 1 ? "" : "s"} for the Lifinity plan "${plan.name}" (${planId}) were ignored in the last 30 days. Add ${planId} to RAZORPAY_ALLOWED_PLAN_IDS in Vercel and redeploy.`,
      })
    }
  }
  if ((byOutcome.get("rejected") ?? 0) > 0) {
    alerts.push({
      level: "red",
      text: `${byOutcome.get("rejected")} request${byOutcome.get("rejected") === 1 ? " was" : "s were"} rejected for a bad signature in the last 30 days. If these are real Razorpay deliveries, RAZORPAY_WEBHOOK_SECRET in Vercel doesn't match the secret on the Razorpay webhook.`,
    })
  }
  if ((byOutcome.get("failed") ?? 0) > 0) {
    alerts.push({
      level: "red",
      text: `${byOutcome.get("failed")} event${byOutcome.get("failed") === 1 ? "" : "s"} failed while being processed in the last 30 days — see the list below for the reason.`,
    })
  }
  const outcomesTracked = recent.some((e) => e.outcome !== null)
  if (!outcomesTracked) {
    alerts.push({
      level: "amber",
      text: "No events with a recorded outcome yet. Outcomes are recorded from this release on; older events show as “recorded”.",
    })
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Every message Razorpay sends to the site, what the site did with it, and why."
      />

      <StatGrid>
        <StatCard icon={Inbox} label="Last message received" value={lastAny ? fmt(lastAny) : "Never"} tone="neutral" />
        <StatCard
          icon={Repeat}
          label="Last renewal recorded"
          value={lastRenewal ? fmt(lastRenewal) : "Never"}
          tone={daysSinceRenewal === null || daysSinceRenewal > 35 ? "bad" : "good"}
          hint={daysSinceRenewal !== null ? `${daysSinceRenewal} days ago` : undefined}
        />
        <StatCard icon={Users} label="Live Lifinity subscriptions" value={liveLifinitySubs} tone="brand" />
        <StatCard
          icon={Activity}
          label="Messages, last 30 days"
          value={recent.length}
          tone={(byOutcome.get("failed") ?? 0) + (byOutcome.get("rejected") ?? 0) ? "warn" : "neutral"}
          hint={`${(byOutcome.get("processed") ?? 0) + (byOutcome.get("recorded") ?? 0)} processed · ${byOutcome.get("ignored") ?? 0} ignored`}
        />
      </StatGrid>

      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((a, i) => (
            <Callout key={i} tone={a.level === "red" ? "bad" : "warn"} icon={a.level === "red" ? CircleAlert : Info} title={a.text} />
          ))}
        </div>
      )}

      <Panel flush title="By event type" description="Last 30 days">
        <DataTable
          emptyIcon={Inbox}
          empty="No webhook messages in the last 30 days."
          head={["Event", "Received", "Processed", "Ignored", "Failed / rejected", "Last"]}
          rows={[...byType.entries()]
            .sort((a, b) => b[1].total - a[1].total)
            .map(([type, t]) => [
              <Mono key="t">{type}</Mono>,
              <span key="n" className="tabular-nums">{t.total}</span>,
              <span key="p" className={`tabular-nums ${TONE_TEXT.good}`}>{t.processed}</span>,
              <span key="i" className={`tabular-nums ${t.ignored ? TONE_TEXT.warn : "text-muted-foreground"}`}>{t.ignored}</span>,
              <span key="f" className={`tabular-nums ${t.failed ? TONE_TEXT.bad : "text-muted-foreground"}`}>{t.failed}</span>,
              <span key="l" className="text-muted-foreground">{fmt(t.last)}</span>,
            ])}
        />
      </Panel>

      <Panel
        flush
        title="Latest messages"
        description="Newest first, up to 150"
        actions={
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
            {["all", ...OUTCOMES].map((o) => (
              <Link
                key={o}
                href={o === "all" ? "/admin/billing/webhooks" : `/admin/billing/webhooks?outcome=${o}`}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${(outcomeFilter ?? "all") === o ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {o}
              </Link>
            ))}
          </div>
        }
      >
        <DataTable
          emptyIcon={Inbox}
          empty="Nothing to show."
          head={["Received", "Event", "Outcome", "Plan", "Payment / subscription", "Why"]}
          rows={list.map((e) => {
            const o = e.outcome ?? "recorded"
            const plan = e.plan_id ? plans.get(e.plan_id) : null
            return [
              <span key="d" className="whitespace-nowrap">{fmtTime(e.created_at)}</span>,
              <Mono key="t">{e.event_type}</Mono>,
              <Pill key="o" tone={OUTCOME_TONE[o] ?? "neutral"}>{o}</Pill>,
              <span key="p" className="text-xs">
                {plan ? (
                  <>
                    {plan.name}
                    {!plan.is_lifinity && <span className="text-muted-foreground"> (not Lifinity)</span>}
                  </>
                ) : (
                  e.plan_id ?? "—"
                )}
              </span>,
              e.entity_id ? (
                <Link key="e" href={`/admin/billing/lookup?q=${e.entity_id}`} className="font-mono text-xs text-primary hover:underline">
                  {e.entity_id}
                </Link>
              ) : (
                <span key="e" className="text-muted-foreground">—</span>
              ),
              <span key="w" className="text-xs text-muted-foreground">{e.error ?? ""}</span>,
            ]
          })}
        />
      </Panel>
    </div>
  )
}
