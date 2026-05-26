import type { Subscriptions } from "razorpay/dist/types/subscriptions"
import { razorpay } from "@/lib/razorpay"
import type { ProductTier } from "@/lib/plans"

// =============================================================================
// Razorpay subscription helpers — three-tier aware (Phase 2A).
//
// At launch each ProductTier maps to ONE Razorpay plan ID, configured via env:
//   library  → RAZORPAY_PLAN_ID_LIBRARY_MONTHLY
//   workshop → RAZORPAY_PLAN_ID_WORKSHOP_MONTHLY
//   ai_lab   → RAZORPAY_PLAN_ID_AI_LAB_MONTHLY
//
// When a milestone band fills, NEW Razorpay plans are minted for the next
// band's prices and the env vars above are repointed. Existing subscriptions
// keep billing on their original plan IDs (Razorpay plans are immutable).
//
// `RAZORPAY_PLAN_ID_MONTHLY` is the legacy single-tier env var. It is still
// honoured by the legacy fallback path (no `tier` argument provided) so the
// pre-three-tier flow keeps working during the transition.
// =============================================================================

const ENV_VAR_FOR_TIER: Readonly<Record<ProductTier, string>> = {
  library: "RAZORPAY_PLAN_ID_LIBRARY_MONTHLY",
  workshop: "RAZORPAY_PLAN_ID_WORKSHOP_MONTHLY",
  ai_lab: "RAZORPAY_PLAN_ID_AI_LAB_MONTHLY",
}

/**
 * Returns the Razorpay plan ID configured for the given product tier.
 *
 * Throws a descriptive error if the env var is unset so the failure mode
 * surfaces at deploy time rather than as a cryptic Razorpay 400 in prod.
 */
export function getRazorpayPlanIdForTier(tier: ProductTier): string {
  const envVar = ENV_VAR_FOR_TIER[tier]
  const planId = process.env[envVar]
  if (!planId) {
    throw new Error(
      `${envVar} is not configured (required for tier=${tier}). ` +
        `Set this env var to the Razorpay plan ID minted for the ${tier} tier.`,
    )
  }
  return planId
}

export type CreateSubscriptionArgs = {
  email: string
  sessionId: string
  /**
   * Product tier the new member is subscribing to. Optional only for the
   * legacy single-tier flow — new callers must always pass this explicitly.
   * When omitted, defaults to `'library'` and a warning is logged.
   */
  tier?: ProductTier
}

export type CreateSubscriptionResult = {
  subscription: Subscriptions.RazorpaySubscription
  planId: string
  tier: ProductTier
}

/**
 * Creates a Razorpay subscription for a new signup.
 *
 * Tier metadata is stamped into Razorpay subscription `notes` so the
 * `subscription.activated` webhook can read it back without needing
 * application state to survive the round-trip.
 *
 * Backwards compatibility: when called without `tier`, falls back to
 *   - `RAZORPAY_PLAN_ID_MONTHLY` (legacy env var) if set, OR
 *   - the `library` tier plan ID otherwise.
 * Either way the row will be tagged `tier: 'library'` in notes so the
 * webhook persists the right metadata.
 */
export async function createSubscription(
  args: CreateSubscriptionArgs,
): Promise<CreateSubscriptionResult> {
  const { email, sessionId } = args
  const tier: ProductTier = args.tier ?? "library"
   
  let planId: string
  if (args.tier) {
    // Explicit tier — use the tier-specific env var. This is the new path.
    planId = getRazorpayPlanIdForTier(tier)
  } else {
    // Legacy fallback: prefer RAZORPAY_PLAN_ID_MONTHLY, otherwise fall back
    // to the library tier plan ID. Warn so log scrapers can surface stragglers.
    console.warn(
      "[razorpay-subscriptions] createSubscription called without tier; " +
        "defaulting to 'library'. Update the caller to pass tier explicitly.",
    )
    const legacyPlanId = process.env.RAZORPAY_PLAN_ID_MONTHLY
    planId = legacyPlanId && legacyPlanId.length > 0
      ? legacyPlanId
      : getRazorpayPlanIdForTier("library")
  }

console.log("Creating Razorpay subscription:", {
  tier,
  planId,
  email,
  sessionId,
})

const subscription = await razorpay.subscriptions.create({
  plan_id: planId,
  total_count: 120,
  customer_notify: 0,
  notes: {
    onboarding_session_id: sessionId,
    email,
    tier,
  },
})
  return { subscription, planId, tier }
}

export async function fetchSubscription(subscriptionId: string) {
  return razorpay.subscriptions.fetch(subscriptionId)
}

export async function cancelSubscription(
  subscriptionId: string,
  cancelAtCycleEnd = true,
) {
  return razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd)
}
