import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { normalisePhone } from "@/lib/billing/razorpay-api"
import {
  reconcile,
  type DbSub,
  type Member,
  type RzpPayment,
  type RzpPlan,
  type RzpSub,
} from "@/lib/billing/reconcile"
import { readSyncState } from "@/lib/billing/sync"

// Loads everything the billing pages read, from the database only. Razorpay
// itself is only contacted by the sync and the health check.

/** Supabase returns at most 1000 rows per request; page through the rest. */
async function selectAll<T>(table: string, columns: string): Promise<T[]> {
  const admin = createAdminClient()
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + 999)
    if (error) throw new Error(`Reading ${table} failed: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) return out
  }
}

export async function loadMembers(): Promise<Member[]> {
  const admin = createAdminClient()
  const users: { id: string; email?: string; phone?: string; last_sign_in_at?: string; created_at: string }[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Listing users failed: ${error.message}`)
    users.push(...data.users)
    if (data.users.length < 1000) break
  }

  const profiles = await selectAll<{ user_id: string; full_name: string | null; phone: string | null; role: string | null }>(
    "profiles",
    "user_id, full_name, phone, role"
  )
  const byUser = new Map(profiles.map((p) => [p.user_id, p]))

  return users
    .filter((u) => byUser.has(u.id))
    .map((u) => {
      const p = byUser.get(u.id)!
      return {
        userId: u.id,
        email: (u.email ?? "").toLowerCase(),
        name: p.full_name,
        phone: normalisePhone(p.phone) ?? normalisePhone(u.phone),
        role: p.role,
        lastSignIn: u.last_sign_in_at ?? null,
        joinedAt: u.created_at ?? null,
      }
    })
}

export async function loadBillingData() {
  const [members, dbSubs, rzpSubs, payments, plans, syncState] = await Promise.all([
    loadMembers(),
    selectAll<DbSub>(
      "subscriptions",
      "id, user_id, plan_label, plan_name, tier, amount_paid, status, starts_at, expires_at, razorpay_subscription_id, razorpay_payment_id, recurring_status, created_at"
    ),
    selectAll<RzpSub>(
      "rzp_subscriptions",
      "id, plan_id, status, email, contact, customer_name, paid_count, created_at, current_start, current_end, charge_at, short_url"
    ),
    selectAll<RzpPayment>(
      "rzp_payments",
      "id, amount, amount_refunded, status, method, email, contact, order_id, invoice_id, subscription_id, description, notes, created_at"
    ),
    selectAll<RzpPlan>("rzp_plans", "id, name, amount, period, interval, is_lifinity"),
    readSyncState(),
  ])

  const rows = reconcile({ members, dbSubs, rzpSubs, payments, plans })

  return { rows, plans, syncState, counts: { members: members.length, rzpSubs: rzpSubs.length, payments: payments.length } }
}
