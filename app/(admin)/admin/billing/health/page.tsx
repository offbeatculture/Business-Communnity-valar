import Link from "next/link"
import { requireBillingAdmin } from "@/lib/billing/page-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { rzpGet } from "@/lib/billing/razorpay-api"
import { allowedPlanIdsSource, getAllowedPlanIds } from "@/lib/billing/config"
import { readSyncState } from "@/lib/billing/sync"
import { fmt, rupees } from "@/lib/billing/reconcile"
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"

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
          <ul className="mt-2 space-y-0.5">
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
  const monthly = process.env.RAZORPAY_PLAN_ID_MONTHLY ?? ""
  const monthlyPlan = (plans ?? []).find((p) => p.id === monthly)
  checks.push(
    !monthly
      ? { title: "Checkout plan", status: "fail", detail: <>RAZORPAY_PLAN_ID_MONTHLY is not set — new members can&apos;t subscribe.</> }
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
          : { title: "Checkout plan", status: "fail", detail: <>RAZORPAY_PLAN_ID_MONTHLY is <code>{monthly}</code>, which doesn&apos;t exist in Razorpay.</> }
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Billing</p>
        <h1 className="mt-1 text-2xl font-bold">Health Check</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Whether payments and renewals can work end to end. Each red item says exactly what to change.
        </p>
      </div>

      <div
        className={`rounded-xl border p-4 text-sm font-medium ${fails ? "border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-400" : "border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-400"}`}
      >
        {fails ? `${fails} problem${fails === 1 ? "" : "s"} need fixing.` : "Everything checks out."}
      </div>

      <div className="space-y-3">
        {checks.map((c) => (
          <div key={c.title} className="flex gap-3 rounded-xl border border-border/70 p-4">
            {c.status === "ok" ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
            ) : c.status === "warn" ? (
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
            )}
            <div className="min-w-0 text-sm">
              <div className="font-semibold">{c.title}</div>
              <div className="mt-0.5 text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-xs">{c.detail}</div>
              {c.fix && c.status !== "ok" && (
                <div className="mt-2 rounded-lg bg-muted/50 p-2 text-xs [&_code]:rounded [&_code]:bg-background [&_code]:px-1">
                  <span className="font-medium">Fix: </span>
                  {c.fix}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
