import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  normalisePhone,
  rzpPage,
  toIso,
  type RzpInvoiceEntity,
  type RzpPaymentEntity,
  type RzpPlanEntity,
  type RzpSubscriptionEntity,
} from "@/lib/billing/razorpay-api"

// Copies the Lifinity-relevant part of Razorpay into the rzp_* tables.
//
// Runs in short steps, because a serverless function times out long before a
// first full sync (~28,000 payments) finishes. Each call does as much as fits
// in its time budget, saves where it got to, and the admin page calls again
// until it reports done. Later syncs only fetch payments since the last one.

const STATE_KEY = "razorpay"

/** Payments before this predate Lifinity entirely. */
const HISTORY_START = Date.UTC(2026, 5, 1) / 1000 - 5.5 * 3600 // 1 Jun 2026 IST

/** Re-read a few days before the last sync to pick up late captures and refunds. */
const OVERLAP_SECONDS = 3 * 24 * 3600

/** Razorpay subscription states that can still be charged. */
const LIVE_SUB_STATUSES = new Set(["created", "authenticated", "active", "pending", "halted"])

type Phase = "plans" | "subscriptions" | "invoices" | "payments" | "done"

export type SyncState = {
  phase: Phase
  mode: "incremental" | "full"
  startedAt: string
  subSkip: number
  invoiceQueue: string[]
  paymentsFrom: number
  paymentsTo: number
  paymentsSkip: number
  /** Where the next incremental payments pass starts. */
  paymentsCursor: number | null
  lastCompletedAt: string | null
  counts: {
    plans: number
    subscriptions: number
    invoicesFetched: number
    paymentsScanned: number
    paymentsKept: number
  }
  error: string | null
}

export type SyncProgress = {
  done: boolean
  phase: Phase
  message: string
  state: SyncState
}

function freshState(previous: SyncState | null, mode: SyncState["mode"]): SyncState {
  const cursor = mode === "full" ? null : previous?.paymentsCursor ?? null
  return {
    phase: "plans",
    mode,
    startedAt: new Date().toISOString(),
    subSkip: 0,
    invoiceQueue: [],
    paymentsFrom: cursor ? cursor - OVERLAP_SECONDS : HISTORY_START,
    paymentsTo: Math.floor(Date.now() / 1000),
    paymentsSkip: 0,
    paymentsCursor: previous?.paymentsCursor ?? null,
    lastCompletedAt: previous?.lastCompletedAt ?? null,
    counts: { plans: 0, subscriptions: 0, invoicesFetched: 0, paymentsScanned: 0, paymentsKept: 0 },
    error: null,
  }
}

export async function readSyncState(): Promise<SyncState | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("rzp_sync_state")
    .select("state")
    .eq("key", STATE_KEY)
    .maybeSingle()
  return (data?.state as SyncState | undefined) ?? null
}

async function saveState(state: SyncState) {
  const admin = createAdminClient()
  await admin
    .from("rzp_sync_state")
    .upsert({ key: STATE_KEY, state, updated_at: new Date().toISOString() })
}

/** Which plans are Lifinity's: by name, plus anything the webhook is told to accept. */
function isLifinityPlan(plan: RzpPlanEntity) {
  const allow = (process.env.RAZORPAY_ALLOWED_PLAN_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const name = plan.item?.name ?? ""
  // "… - TEST" plans were used to try checkout; they aren't real members.
  if (/\btest\b/i.test(name)) return false
  return allow.includes(plan.id) || /lifinity|breathwork|valar/i.test(name)
}

/** Emails and phone numbers of everyone with a Lifinity account. */
async function loadMemberIdentity() {
  const admin = createAdminClient()
  const emails = new Set<string>()
  const phones = new Set<string>()

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Listing users failed: ${error.message}`)
    for (const u of data.users) {
      if (u.email) emails.add(u.email.toLowerCase())
      const p = normalisePhone(u.phone)
      if (p) phones.add(p)
    }
    if (data.users.length < 1000) break
  }

  const { data: profiles } = await admin.from("profiles").select("phone")
  for (const row of profiles ?? []) {
    const p = normalisePhone(row.phone as string | null)
    if (p) phones.add(p)
  }

  return { emails, phones }
}

/**
 * Run one step of the sync. `start` begins a new run; otherwise it continues
 * the one in progress. Returns once the work is done or the budget is spent.
 */
export async function runSyncStep(opts: {
  start?: boolean
  mode?: SyncState["mode"]
  budgetMs?: number
}): Promise<SyncProgress> {
  const deadline = Date.now() + (opts.budgetMs ?? 40_000)
  const admin = createAdminClient()
  const previous = await readSyncState()

  const state: SyncState =
    opts.start || !previous || previous.phase === "done"
      ? freshState(previous, opts.mode ?? "incremental")
      : previous

  if (!opts.start && previous?.phase === "done") {
    return { done: true, phase: "done", message: "Nothing to do", state: previous }
  }

  let identity: Awaited<ReturnType<typeof loadMemberIdentity>> | null = null
  const timeLeft = () => deadline - Date.now()

  try {
    while (state.phase !== "done" && timeLeft() > 3_000) {
      // ── Plans ─────────────────────────────────────────────────────────
      if (state.phase === "plans") {
        const plans: RzpPlanEntity[] = []
        for (let skip = 0; ; skip += 100) {
          const page = await rzpPage<RzpPlanEntity>("/plans", { skip })
          plans.push(...page)
          if (page.length < 100) break
        }
        await admin.from("rzp_plans").upsert(
          plans.map((p) => ({
            id: p.id,
            name: p.item?.name ?? null,
            amount: p.item?.amount ?? null,
            period: p.period,
            interval: p.interval,
            is_lifinity: isLifinityPlan(p),
            created_at: toIso(p.created_at),
            synced_at: new Date().toISOString(),
          }))
        )
        state.counts.plans = plans.length
        state.phase = "subscriptions"
        continue
      }

      // ── Subscriptions (all of them; they carry no personal data) ─────
      if (state.phase === "subscriptions") {
        const page = await rzpPage<RzpSubscriptionEntity>("/subscriptions", {
          skip: state.subSkip,
        })
        if (page.length) {
          await admin.from("rzp_subscriptions").upsert(
            page.map((s) => ({
              id: s.id,
              plan_id: s.plan_id,
              status: s.status,
              customer_id: s.customer_id,
              paid_count: s.paid_count,
              total_count: s.total_count,
              created_at: toIso(s.created_at),
              start_at: toIso(s.start_at),
              current_start: toIso(s.current_start),
              current_end: toIso(s.current_end),
              charge_at: toIso(s.charge_at),
              ended_at: toIso(s.ended_at),
              short_url: s.short_url,
              notes: s.notes ?? null,
              synced_at: new Date().toISOString(),
            })),
            { onConflict: "id" }
          )
        }
        state.counts.subscriptions += page.length
        state.subSkip += page.length

        if (page.length < 100) {
          // Queue the Lifinity subscriptions whose invoices need (re)reading:
          // anything still chargeable, anything never read, or everything on
          // a full sync. Ended subscriptions don't change, so they're read once.
          const { data: lifinityPlans } = await admin
            .from("rzp_plans")
            .select("id")
            .eq("is_lifinity", true)
          const planIds = (lifinityPlans ?? []).map((p) => p.id as string)

          const { data: subs } = planIds.length
            ? await admin
                .from("rzp_subscriptions")
                .select("id, status, invoices_synced_at")
                .in("plan_id", planIds)
            : { data: [] as { id: string; status: string; invoices_synced_at: string | null }[] }

          state.invoiceQueue = (subs ?? [])
            .filter(
              (s) =>
                state.mode === "full" ||
                !s.invoices_synced_at ||
                LIVE_SUB_STATUSES.has(s.status as string)
            )
            .map((s) => s.id as string)
          state.phase = "invoices"
        }
        continue
      }

      // ── Invoices of Lifinity subscriptions → who paid, and when ──────
      if (state.phase === "invoices") {
        const subId = state.invoiceQueue.shift()
        if (!subId) {
          state.phase = "payments"
          continue
        }

        const invoices = await rzpPage<RzpInvoiceEntity>("/invoices", {
          subscription_id: subId,
        })
        state.counts.invoicesFetched += 1

        let email: string | null = null
        let contact: string | null = null
        let name: string | null = null
        for (const inv of invoices) {
          email = email ?? (inv.customer_details?.email?.toLowerCase() || null)
          contact = contact ?? normalisePhone(inv.customer_details?.contact)
          name = name ?? (inv.customer_details?.name || null)
        }

        await admin
          .from("rzp_subscriptions")
          .update({
            email,
            contact,
            customer_name: name,
            invoices_synced_at: new Date().toISOString(),
          })
          .eq("id", subId)

        const paid = invoices.filter((i) => i.status === "paid" && i.payment_id)
        if (paid.length) {
          // Insert a placeholder for payments the payments pass hasn't seen
          // yet (it will fill in the rest), then tag every one with its
          // subscription — which only the invoice knows.
          await admin.from("rzp_payments").upsert(
            paid.map((i) => ({
              id: i.payment_id as string,
              amount: i.amount,
              status: "captured",
              email: i.customer_details?.email?.toLowerCase() || null,
              contact: normalisePhone(i.customer_details?.contact),
              invoice_id: i.id,
              created_at: toIso(i.paid_at),
              kept_because: "lifinity_invoice",
            })),
            { onConflict: "id", ignoreDuplicates: true }
          )
          await admin
            .from("rzp_payments")
            .update({ subscription_id: subId, kept_because: "lifinity_invoice" })
            .in(
              "id",
              paid.map((i) => i.payment_id as string)
            )
        }
        continue
      }

      // ── Payments: everything since the cursor, keep only Lifinity's ──
      if (state.phase === "payments") {
        identity = identity ?? (await loadMemberIdentity())

        const page = await rzpPage<RzpPaymentEntity>("/payments", {
          from: state.paymentsFrom,
          to: state.paymentsTo,
          skip: state.paymentsSkip,
        })
        state.counts.paymentsScanned += page.length
        state.paymentsSkip += page.length

        if (page.length) {
          const ids = page.map((p) => p.id)
          const { data: existing } = await admin
            .from("rzp_payments")
            .select("id, kept_because")
            .in("id", ids)
          const known = new Map((existing ?? []).map((r) => [r.id as string, r.kept_because as string]))

          const keep = page.filter((p) => {
            if (known.has(p.id)) return true
            const email = p.email?.toLowerCase()
            const phone = normalisePhone(p.contact)
            return (
              (email && identity!.emails.has(email)) ||
              (phone && identity!.phones.has(phone))
            )
          })

          if (keep.length) {
            await admin.from("rzp_payments").upsert(
              keep.map((p) => ({
                id: p.id,
                amount: p.amount,
                amount_refunded: p.amount_refunded ?? 0,
                status: p.status,
                method: p.method,
                email: p.email?.toLowerCase() || null,
                contact: normalisePhone(p.contact),
                order_id: p.order_id,
                invoice_id: p.invoice_id,
                description: p.description,
                notes: p.notes ?? null,
                created_at: toIso(p.created_at),
                kept_because: known.get(p.id) ?? "member_match",
                synced_at: new Date().toISOString(),
              })),
              { onConflict: "id" }
            )
            state.counts.paymentsKept += keep.length
          }
        }

        if (page.length < 100) {
          state.paymentsCursor = state.paymentsTo
          state.lastCompletedAt = new Date().toISOString()
          state.phase = "done"
        }
        continue
      }
    }
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
    await saveState(state)
    return { done: true, phase: state.phase, message: `Sync stopped: ${state.error}`, state }
  }

  await saveState(state)

  const c = state.counts
  const message =
    state.phase === "done"
      ? `Synced ${c.subscriptions} subscriptions, read ${c.invoicesFetched} Lifinity subscriptions' invoices, scanned ${c.paymentsScanned} payments and kept ${c.paymentsKept}.`
      : state.phase === "invoices"
        ? `Reading invoices — ${state.invoiceQueue.length} subscriptions left`
        : state.phase === "payments"
          ? `Scanning payments — ${c.paymentsScanned} so far, ${c.paymentsKept} kept`
          : `Syncing ${state.phase}…`

  return { done: state.phase === "done", phase: state.phase, message, state }
}
