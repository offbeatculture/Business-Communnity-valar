import "server-only"

// Minimal read-only Razorpay REST client for the billing admin.
//
// The `razorpay` npm package is used for checkout and webhooks; this exists
// because the billing pages need plain paging (count/skip/from/to) over
// thousands of records, and a thin fetch wrapper keeps that obvious.

const BASE = "https://api.razorpay.com/v1"

export class RazorpayApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID ?? ""
  const secret = process.env.RAZORPAY_KEY_SECRET ?? ""
  if (!id || !secret) {
    throw new RazorpayApiError("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set", 500)
  }
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64")
}

export async function rzpGet<T = Record<string, unknown>>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v))
  }

  const res = await fetch(url, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  })

  if (!res.ok) {
    let detail = ""
    try {
      const body = (await res.json()) as { error?: { description?: string } }
      detail = body.error?.description ?? ""
    } catch {
      // non-JSON error body
    }
    throw new RazorpayApiError(
      `Razorpay ${path} failed: HTTP ${res.status}${detail ? ` — ${detail}` : ""}`,
      res.status
    )
  }

  return (await res.json()) as T
}

/** One page of a Razorpay collection. Razorpay caps `count` at 100. */
export async function rzpPage<T = Record<string, unknown>>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T[]> {
  const body = await rzpGet<{ items?: T[] }>(path, { count: 100, ...params })
  return body.items ?? []
}

// ─── Entity shapes (only the fields the billing admin reads) ───────────────

export type RzpPlanEntity = {
  id: string
  period: string
  interval: number
  created_at: number
  item: { name: string; amount: number }
}

export type RzpSubscriptionEntity = {
  id: string
  plan_id: string
  status: string
  customer_id: string | null
  paid_count: number
  total_count: number
  created_at: number
  start_at: number | null
  current_start: number | null
  current_end: number | null
  charge_at: number | null
  ended_at: number | null
  short_url: string | null
  notes: Record<string, unknown> | unknown[] | null
}

export type RzpInvoiceEntity = {
  id: string
  status: string
  payment_id: string | null
  subscription_id: string | null
  amount: number
  paid_at: number | null
  customer_details: { email?: string | null; contact?: string | null; name?: string | null } | null
}

export type RzpPaymentEntity = {
  id: string
  amount: number
  amount_refunded: number
  status: string
  method: string | null
  email: string | null
  contact: string | null
  order_id: string | null
  invoice_id: string | null
  description: string | null
  notes: Record<string, unknown> | unknown[] | null
  created_at: number
}

export const toIso = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toISOString() : null

/** Indian mobile numbers arrive as +91…, 91…, or bare; compare on the last ten digits. */
export function normalisePhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "")
  return digits.length >= 10 ? digits.slice(-10) : null
}
