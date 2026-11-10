import Link from "next/link"
import { requireBillingAdmin } from "@/lib/billing/page-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { fmt } from "@/lib/billing/reconcile"

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
const OUTCOME_STYLE: Record<string, string> = {
  processed: "text-green-600 dark:text-green-400",
  recorded: "text-green-600 dark:text-green-400",
  failed: "text-red-600 dark:text-red-400",
  rejected: "text-red-600 dark:text-red-400",
  ignored: "text-amber-600 dark:text-amber-400",
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Billing</p>
        <h1 className="mt-1 text-2xl font-bold">Webhooks</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Every message Razorpay sends to the site, what the site did with it, and why. Ignored and rejected messages
          used to leave no trace — they now show here.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Last message received" value={lastAny ? fmt(lastAny) : "never"} />
        <Stat
          label="Last renewal recorded"
          value={lastRenewal ? fmt(lastRenewal) : "never"}
          tone={daysSinceRenewal !== null && daysSinceRenewal > 35 ? "red" : undefined}
        />
        <Stat label="Live Lifinity subscriptions" value={String(liveLifinitySubs)} />
        <Stat label="Messages, last 30 days" value={String(recent.length)} />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 text-sm ${a.level === "red" ? "border-red-500/40 bg-red-500/5" : "border-amber-500/40 bg-amber-500/5"}`}
            >
              {a.text}
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold">By event type — last 30 days</h2>
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">Event</th>
                <th className="p-2 font-medium">Received</th>
                <th className="p-2 font-medium">Processed</th>
                <th className="p-2 font-medium">Ignored</th>
                <th className="p-2 font-medium">Failed / rejected</th>
                <th className="p-2 font-medium">Last</th>
              </tr>
            </thead>
            <tbody>
              {[...byType.entries()]
                .sort((a, b) => b[1].total - a[1].total)
                .map(([type, t]) => (
                  <tr key={type} className="border-t border-border/60">
                    <td className="p-2 font-mono text-xs">{type}</td>
                    <td className="p-2">{t.total}</td>
                    <td className="p-2 text-green-600 dark:text-green-400">{t.processed}</td>
                    <td className={`p-2 ${t.ignored ? "text-amber-600" : ""}`}>{t.ignored}</td>
                    <td className={`p-2 ${t.failed ? "text-red-600" : ""}`}>{t.failed}</td>
                    <td className="p-2 text-xs text-muted-foreground">{fmt(t.last)}</td>
                  </tr>
                ))}
              {byType.size === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No webhook messages in the last 30 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Latest messages</h2>
          {["all", ...OUTCOMES].map((o) => (
            <Link
              key={o}
              href={o === "all" ? "/admin/billing/webhooks" : `/admin/billing/webhooks?outcome=${o}`}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${(outcomeFilter ?? "all") === o ? "border-primary bg-primary/10" : "border-border/70 hover:border-primary/50"}`}
            >
              {o}
            </Link>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">Received</th>
                <th className="p-2 font-medium">Event</th>
                <th className="p-2 font-medium">Outcome</th>
                <th className="p-2 font-medium">Plan</th>
                <th className="p-2 font-medium">Payment / subscription</th>
                <th className="p-2 font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e, i) => {
                const o = e.outcome ?? "recorded"
                const plan = e.plan_id ? plans.get(e.plan_id) : null
                return (
                  <tr key={i} className="border-t border-border/60 align-top">
                    <td className="whitespace-nowrap p-2">
                      {new Date(e.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="p-2 font-mono">{e.event_type}</td>
                    <td className={`p-2 font-medium ${OUTCOME_STYLE[o] ?? ""}`}>{o}</td>
                    <td className="p-2">{plan ? `${plan.name}${plan.is_lifinity ? "" : " (not Lifinity)"}` : e.plan_id ?? "—"}</td>
                    <td className="p-2 font-mono text-[10px]">
                      {e.entity_id ? (
                        <Link href={`/admin/billing/lookup?q=${e.entity_id}`} className="text-primary hover:underline">
                          {e.entity_id}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground">{e.error ?? ""}</td>
                  </tr>
                )
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Nothing to show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "red" }) {
  return (
    <div className="rounded-xl border border-border/70 p-3">
      <div className={`text-lg font-bold ${tone === "red" ? "text-red-600 dark:text-red-400" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
