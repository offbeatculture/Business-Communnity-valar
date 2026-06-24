import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SINGLE_PLAN, type ProductTier } from "@/lib/plans"

const SINGLE_TIER: ProductTier = "membership"

export type UserTierState = {
  tier: ProductTier
  tierRank: 1 | 2 | 3
  lockedPricePaise: number
  bandAtSignup: string
  isAdmin: boolean
} | null

export async function getUserTier(): Promise<UserTierState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier, tier_rank, locked_price_paise, band_at_signup, expires_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!subscription && isAdmin) {
    return {
      tier: SINGLE_TIER,
      tierRank: 1,
      lockedPricePaise: SINGLE_PLAN.amountPaise,
      bandAtSignup: "membership",
      isAdmin: true,
    }
  }

  if (!subscription) return null

  return {
    tier: SINGLE_TIER,
    tierRank: 1,
    lockedPricePaise:
      subscription.locked_price_paise ?? SINGLE_PLAN.amountPaise,
    bandAtSignup: subscription.band_at_signup ?? "membership",
    isAdmin,
  }
}

export class TierAccessError extends Error {
  readonly response: NextResponse

  constructor(response: NextResponse, message: string) {
    super(message)
    this.name = "TierAccessError"
    this.response = response
  }
}

export async function requireTier(
  _minTier: ProductTier
): Promise<NonNullable<UserTierState>> {
  const state = await getUserTier()

  if (!state) {
    throw new TierAccessError(
      NextResponse.json(
        { error: "Active membership required" },
        { status: 403 }
      ),
      "Active membership required"
    )
  }

  return state
}

export async function requireActiveSubscription(): Promise<
  NonNullable<UserTierState>
> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new TierAccessError(
      NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
      "Unauthenticated"
    )
  }

  const state = await getUserTier()

  if (!state) {
    throw new TierAccessError(
      NextResponse.json(
        { error: "Active membership required" },
        { status: 403 }
      ),
      "No active membership"
    )
  }

  return state
}