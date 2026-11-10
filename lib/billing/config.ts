// Razorpay settings shared by the webhook and the billing Health page, so the
// page reports exactly what the webhook enforces.

/**
 * The plans the webhook accepts when RAZORPAY_ALLOWED_PLAN_IDS isn't set.
 *
 * Only the ₹999 Breathwork plan. The ₹1,499 Lifinity plan is NOT here, so
 * without the environment variable its events are ignored — the Health page
 * flags this.
 */
export const DEFAULT_ALLOWED_RAZORPAY_PLAN_IDS = ["plan_T5PqUyQl2B5p4t"]

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
