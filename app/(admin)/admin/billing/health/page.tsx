import Link from "next/link"
import { requireBillingAdmin } from "@/lib/billing/page-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { rzpGet } from "@/lib/billing/razorpay-api"
import { allowedPlanIdsSource, getAllowedPlanIds } from "@/lib/billing/config"
import { readSyncState } from "@/lib/billing/sync"
import { fmt, rupees } from "@/lib/billing/reconcile"
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { PageHeader, Panel, Pill, StatCard, StatGrid, type Tone } from "@/components/admin/billing/ui"
import { CHECKOUT_PLAN_ID } from "@/lib/billing/plan-ids"

export const dynamic = "force-dynamic"

type Status = "ok" | "warn" | "fail"
type Check = { title: string; status: Status; detail: React.ReactNode; fix?: React.ReactNode }

const DAY = 24 * 3600 * 1000

/**
 * Every check here is something that broke in October/November 2026 and was
 * found by hand: a regenerated Razorpay key the site was still using, a
 * checkout key that only changes on redeploy, a plan the webhook silently
 * ignored, renewals going unrecorded for weeks.
 */
export default async function BillingHealthPage() {
  await requireBillingAdmin()
  // One clock reading per request, so every check agrees on "now".
  const nowMs = new Date().getTime()
  const admin = createAdminClient()
  const checks: Check[] = []

  // ── 1. Razorpay API key works ───────────────────────────────────────────
  const serverKey = process.env.RAZORPAY_KEY_ID ?? ""
  let keyError: string | null = null
  try {
    await rzpGet("/plans", { count: 1 })
  } catch (err) {
    keyError = err instanceof Error ? err.message : String(err)
  }
  checks.push(
    keyError
      ? {
          title: "Razorpay key works",
          status: "fail",
          detail: <>Razorpay refused key <code>{serverKey || "(not set)"}</code>: {keyError}</>,
          fix: <>If the key was regenerated in Razorpay, update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel and redeploy.</>,
        }
      : {
          title: "Razorpay key works",
          status: "ok",
          detail: <>The site can talk to Razorpay with key <code>{serverKey}</code>.</>,
        }
  )

  // ── 2. Checkout key matches the server key ─────────────────────────────
  // NEXT_PUBLIC_ values are baked in when the site is built, so this shows
  // what members' browsers actually use.
  const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? ""
  checks.push(
    publicKey && publicKey === serverKey
      ? { title: "Checkout uses the same key", status: "ok", detail: <>Members&apos; checkout uses <code>{publicKey}</code>.</> }
      : {
          title: "Checkout uses the same key",
          status: "fail",
          detail: (
            <>
              Checkout uses <code>{publicKey || "(not set)"}</code> but the server uses <code>{serverKey || "(not set)"}</code>.
              Payments will fail at checkout with &ldquo;Something went wrong&rdquo;.
            </>
          ),
          fix: <>Set NEXT_PUBLIC_RAZORPAY_KEY_ID to the same key in Vercel, then <strong>redeploy</strong> — it only changes on a new build.</>,
        }
  )

  // ── 3. Webhook secret ──────────────────────────────────────────────────
  checks.push(
    process.env.RAZORPAY_WEBHOOK_SECRET
      ? { title: "Webhook secret is set", status: "ok", detail: <>RAZORPAY_WEBHOOK_SECRET is set. If it didn&apos;t match Razorpay&apos;s, messages would show as “rejected” on the Webhooks page.</> }
      : { title: "Webhook secret is set", status: "fail", detail: <>RAZORPAY_WEBHOOK_SECRET is missing — every Razorpay message is refused.</>, fix: <>Copy the secret from the Razorpay webhook into Vercel and redeploy.</> }
  )

  // ── 4. Every Lifinity plan is on the webhook's allowed list ────────────
  const allowed = getAllowedPlanIds()
  const source = allowedPlanIdsSource()
  const [{ data: plans }, { data: subs }] = await Promise.all([
    admin.from("rzp_plans").select("id, name, amount, period, is_lifinity"),
    admin.from("rzp_subscriptions").select("plan_id, status"),
  ])
  const lifinityPlans = (plans ?? []).filter((p) => p.is_lifinity)
  const subCount = (planId: string) => (subs ?? []).filter((s) => s.plan_id === planId).length
  const missing = lifinityPlans.filter((p) => !allowed.includes(p.id as string) && subCount(p.id as string) > 0)

  if (!plans?.length) {
    checks.push({
      title: "Webhook accepts every Lifinity plan",
      status: "warn",
      detail: <>Can&apos;t check yet — Razorpay hasn&apos;t been synced. Press Sync now on the <Link className="text-primary underline" href="/admin/billing">Reconciliation</Link> page.</>,
    })
  } else {
    checks.push({
      title: "Webhook accepts every Lifinity plan",
      status: missing.length ? "fail" : "ok",
      detail: (
        <>
          Allowed {source === "env" ? "(from RAZORPAY_ALLOWED_PLAN_IDS)" : "(built-in default — RAZORPAY_ALLOWED_PLAN_IDS is not set)"}:{" "}
          <code>{allowed.join(", ")}</code>
          <ul className="mt-2 space-y-1">
            {lifinityPlans.map((p) => (
              <li key={p.id as string}>
                {allowed.includes(p.id as string) ? "✓" : "✗"} {p.name as string} — {rupees(p.amount as number)}/{p.period as string}{" "}
                <code>{p.id as string}</code> · {subCount(p.id as string)} subscriptions
              </li>
            ))}
          </ul>
        </>
      ),
      fix: missing.length ? (
        <>
          Set RAZORPAY_ALLOWED_PLAN_IDS in Vercel to{" "}
          <code>{[...new Set([...allowed, ...missing.map((p) => p.id as string)])].join(",")}</code> and redeploy. Until
          then, payments and renewals on {missing.map((p) => `“${p.name}”`).join(", ")} are thrown away.
        </>
      ) : undefined,
    })
  }

  // ── 5. Monthly plan used by checkout ───────────────────────────────────
  const monthly = CHECKOUT_PLAN_ID
  const monthlyPlan = (plans ?? []).find((p) => p.id === monthly)
  checks.push(
    !monthly
      ? { title: "Checkout plan", status: "fail", detail: <>No checkout plan is set in lib/billing/plan-ids.ts.</> }
      : !plans?.length
        ? { title: "Checkout plan", status: "warn", detail: <>Checkout sells <code>{monthly}</code>. Sync to check it.</> }
        : monthlyPlan
          ? {
              title: "Checkout plan",
              status: monthlyPlan.is_lifinity && allowed.includes(monthly) ? "ok" : "fail",
              detail: (
                <>
                  New members subscribe to “{monthlyPlan.name as string}” — {rupees(monthlyPlan.amount as number)}/
                  {monthlyPlan.period as string} (<code>{monthly}</code>)
                  {!allowed.includes(monthly) && <>. <strong>It is not on the webhook&apos;s allowed list</strong>, so their renewals won&apos;t be recorded.</>}
                </>
              ),
            }
          : { title: "Checkout plan", status: "fail", detail: <>The checkout plan <code>{monthly}</code> (lib/billing/plan-ids.ts) doesn&apos;t exist in Razorpay.</> }
  )

  // ── 6. Renewals are arriving ───────────────────────────────────────────
  const { data: lastRenewal } = await admin
    .from("webhook_events")
    .select("created_at")
    .eq("event_type", "subscription.charged")
    .or("outcome.is.null,outcome.eq.processed")
    .order("created_at", { ascending: false })
    .limit(1)
  const lastRenewalAt = lastRenewal?.[0]?.created_at as string | undefined
  const renewalAge = lastRenewalAt ? (nowMs - new Date(lastRenewalAt).getTime()) / DAY : Infinity
  checks.push({
    title: "Renewals are being recorded",
    status: renewalAge <= 35 ? "ok" : "fail",
    detail: lastRenewalAt ? (
      <>Last renewal recorded {fmt(lastRenewalAt)} ({Math.floor(renewalAge)} days ago).</>
    ) : (
      <>No renewal has ever been recorded.</>
    ),
    fix:
      renewalAge > 35 ? (
        <>Open <Link className="text-primary underline" href="/admin/billing/webhooks">Webhooks</Link> to see whether renewals are arriving and being ignored or failing.</>
      ) : undefined,
  })

  // ── 7. Billing tables and sync ─────────────────────────────────────────
  let syncState: Awaited<ReturnType<typeof readSyncState>> = null
  let migrationOk = true
  try {
    syncState = await readSyncState()
    const { error } = await admin.from("webhook_events").select("outcome").limit(1)
    if (error) migrationOk = false
  } catch {
    migrationOk = false
  }
  checks.push(
    migrationOk
      ? {
          title: "Razorpay data is fresh",
          status: !syncState?.lastCompletedAt
            ? "warn"
            : nowMs - new Date(syncState.lastCompletedAt).getTime() > DAY
              ? "warn"
              : "ok",
          detail: syncState?.lastCompletedAt ? (
            <>Last synced {fmt(syncState.lastCompletedAt)}{syncState.error && <> — last attempt stopped: {syncState.error}</>}.</>
          ) : (
            <>Never synced.</>
          ),
          fix: <>Press Sync now on the <Link className="text-primary underline" href="/admin/billing">Reconciliation</Link> page.</>,
        }
      : {
          title: "Billing database tables",
          status: "fail",
          detail: <>The billing tables don&apos;t exist yet.</>,
          fix: <>Run <code>supabase/migrations/20261110_billing_admin.sql</code> in the Supabase SQL editor.</>,
        }
  )

  const order: Record<Status, number> = { fail: 0, warn: 1, ok: 2 }
  checks.sort((a, b) => order[a.status] - order[b.status])
  const fails = checks.filter((c) => c.status === "fail").length
  const warns = checks.filter((c) => c.status === "warn").length
  const passes = checks.length - fails - warns

  const TONE: Record<Status, Tone> = { ok: "good", warn: "warn", fail: "bad" }
  const ICON = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle }
  const LABEL: Record<Status, string> = { ok: "Passing", warn: "Check", fail: "Needs fixing" }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health Check"
        description="Whether payments and renewals work from start to finish. Anything red tells you exactly what to change."
      />

      <StatGrid cols={3}>
        <StatCard icon={CheckCircle2} label="Passing" value={passes} tone="good" />
        <StatCard icon={AlertTriangle} label="Need a look" value={warns} tone={warns ? "warn" : "neutral"} />
        <StatCard icon={XCircle} label="Need fixing" value={fails} tone={fails ? "bad" : "neutral"} />
      </StatGrid>

      <Panel flush title="Checks" description={fails ? `${fails} problem${fails === 1 ? "" : "s"} to fix. They're listed first.` : "Everything checks out."}>
        <ul className="divide-y">
          {checks.map((c) => {
            const Icon = ICON[c.status]
            return (
              <li key={c.title} className="flex gap-4 px-5 py-4">
                <div className={`h-fit rounded-lg p-2 ${c.status === "ok" ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-300" : c.status === "warn" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-destructive/10 text-destructive"}`}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{c.title}</p>
                    <Pill tone={TONE[c.status]}>{LABEL[c.status]}</Pill>
                  </div>
                  <div className="mt-1 text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-foreground">
                    {c.detail}
                  </div>
                  {c.fix && c.status !== "ok" && (
                    <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs [&_code]:break-all [&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_code]:py-0.5">
                      <span className="font-semibold text-primary">How to fix: </span>
                      {c.fix}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}
