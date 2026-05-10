// ============================================================
// Tier access enforcement helpers (server-side)
//
// Phase 3 of the three-tier subscription system. These helpers are the
// single source of truth for "what tier does the current user have?" on
// the server. Use them at the top of API routes and in server components
// to gate access by tier.
//
// Spec: Three-tier-implementation-plan.md, section 6.2 (API layer).
//
// IMPORTANT: This file is server-only. The `import "server-only"` line
// at the top causes a build error if any client-side code imports it.
// Use `lib/hooks/use-user-tier.ts` for client-side tier reads.
// ============================================================

import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  type ProductTier,
  getTierRank,
  tierMeetsRequirement,
} from "@/lib/plans"

// ── Types ──

export type UserTierState = {
  tier: ProductTier
  tierRank: 1 | 2 | 3
  lockedPricePaise: number
  bandAtSignup: string
  isAdmin: boolean
} | null

// ── Helpers ──

/**
 * Reads the active tier for the currently authenticated user. Returns null
 * if the request is unauthenticated, the profile is missing, or the user
 * has no active subscription. Reads admin status from `profiles.role`
 * (admin = role === 'admin').
 *
 * Selects the most-recent active subscription by `expires_at DESC`, matching
 * the pattern used in `middleware.ts` and `lib/profile.ts`.
 */
export async function getUserTier(): Promise<UserTierState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Read admin flag from profiles.role. Codebase convention: admin = 'admin'.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"

  // Most-recent active subscription. status='active' is the canonical filter
  // (see initial schema migration 001 and the tier_rank index in the
  // three-tier migration). Order by expires_at DESC to mirror the pattern
  // used in middleware and lib/profile.ts.
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier, tier_rank, locked_price_paise, band_at_signup")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!subscription) return null

  // Defensive narrowing — the DB CHECK constraint guarantees these values,
  // but TypeScript sees them as `string`/`number`.
  const tier = subscription.tier as ProductTier
  const tierRank = subscription.tier_rank as 1 | 2 | 3

  return {
    tier,
    tierRank,
    lockedPricePaise: subscription.locked_price_paise ?? 0,
    bandAtSignup: subscription.band_at_signup ?? "founding",
    isAdmin,
  }
}

/**
 * Internal sentinel error used to bubble a NextResponse out of a helper.
 * API routes can catch this in a try/catch if they need custom handling,
 * but the simpler pattern is to let it propagate — Next.js will return
 * the attached Response.
 *
 * We wrap NextResponse.json in an Error subclass so that `throw` works
 * with TypeScript's `never` inference and so the thrown value is always
 * an instance of Error (which some runtimes assume).
 */
export class TierAccessError extends Error {
  readonly response: NextResponse

  constructor(response: NextResponse, message: string) {
    super(message)
    this.name = "TierAccessError"
    this.response = response
  }
}

/**
 * Throws a TierAccessError carrying a 403 NextResponse if the user does
 * not meet the required tier. Returns the user tier state on success.
 *
 * Usage in an API route:
 *
 *     try {
 *       const tier = await requireTier("workshop")
 *       // ... protected logic
 *     } catch (e) {
 *       if (e instanceof TierAccessError) return e.response
 *       throw e
 *     }
 */
export async function requireTier(
  minTier: ProductTier,
): Promise<NonNullable<UserTierState>> {
  const state = await getUserTier()

  if (!state) {
    throw new TierAccessError(
      NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
      "Unauthenticated",
    )
  }

  // Admins bypass tier gating — they need to be able to access every
  // tier-gated resource for moderation, support, and content management.
  if (state.isAdmin) return state

  if (!tierMeetsRequirement(state.tier, minTier)) {
    throw new TierAccessError(
      NextResponse.json(
        {
          error: "Insufficient tier",
          requiredTier: minTier,
          requiredRank: getTierRank(minTier),
          currentTier: state.tier,
          currentRank: state.tierRank,
        },
        { status: 403 },
      ),
      `Tier ${state.tier} (rank ${state.tierRank}) does not meet required tier ${minTier} (rank ${getTierRank(minTier)})`,
    )
  }

  return state
}

/**
 * Throws 401 if no auth, or 403 if no active subscription regardless of
 * tier. Use for any route that requires a paying member but does not
 * care which tier (e.g. community feed posts).
 *
 * Admins bypass the active-subscription check, matching `requireTier`.
 */
export async function requireActiveSubscription(): Promise<
  NonNullable<UserTierState>
> {
  // We need to distinguish "no auth" from "auth but no active sub" so we
  // can throw the right status code. getUserTier collapses both to null,
  // so do an auth check first.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new TierAccessError(
      NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
      "Unauthenticated",
    )
  }

  const state = await getUserTier()

  if (!state) {
    throw new TierAccessError(
      NextResponse.json(
        { error: "Active subscription required" },
        { status: 403 },
      ),
      "No active subscription",
    )
  }

  return state
}
