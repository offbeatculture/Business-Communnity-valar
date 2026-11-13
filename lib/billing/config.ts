import { PLAN_ID_999, PLAN_ID_1499 } from "@/lib/billing/plan-ids"
// Razorpay settings shared by the webhook and the billing Health page, so the
// page reports exactly what the webhook enforces.

/**
 * The plans the webhook accepts when RAZORPAY_ALLOWED_PLAN_IDS isn't set.
 *
 * The ₹999 and ₹1,499 Lifinity plans (see plan-ids.ts).
 */
export const DEFAULT_ALLOWED_RAZORPAY_PLAN_IDS = [PLAN_ID_999, PLAN_ID_1499]

/** What the webhook accepts right now, and whether that came from Vercel. */
export function getAllowedPlanIds() {
  const fromEnv = (process.env.RAZORPAY_ALLOWED_PLAN_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)

  return fromEnv.length > 0 ? fromEnv : DEFAULT_ALLOWED_RAZORPAY_PLAN_IDS
}

export function allowedPlanIdsSource(): "env" | "default" {
  return (process.env.RAZORPAY_ALLOWED_PLAN_IDS ?? "").trim() ? "env" : "default"
}
