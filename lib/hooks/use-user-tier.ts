// ============================================================
// useUserTier — client hook for reading the active tier
//
// Phase 3 of the three-tier subscription system. This hook is the
// client-side counterpart of `lib/auth/tier.ts` and is the single way
// React components should read the current user's tier.
//
// NOT a security boundary. Always re-check tier server-side in API routes
// (via `requireTier`) and at the database (via RLS using the SQL function
// `current_user_tier_rank()`). This hook is purely for UX — show/hide
// upgrade CTAs, render the right pricing card, gate visual sections.
//
// Spec: Three-tier-implementation-plan.md, section 6.1 (UI layer).
// ============================================================

"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import type { ProductTier } from "@/lib/plans"

export type UseUserTierResult = {
  tier: ProductTier | null
  tierRank: 0 | 1 | 2 | 3 // 0 = no active subscription
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useUserTier(): UseUserTierResult {
  const [tier, setTier] = useState<ProductTier | null>(null)
  const [tierRank, setTierRank] = useState<0 | 1 | 2 | 3>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Stable supabase instance for the lifetime of the component.
  const supabaseRef = useRef(createClient())

  // Tracks whether the component is still mounted, so we don't call
  // setState after unmount during an in-flight fetch.
  const mountedRef = useRef(true)

  const fetchTier = useCallback(async () => {
    const supabase = supabaseRef.current
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError

      if (!user) {
        if (!mountedRef.current) return
        setTier(null)
        setTierRank(0)
        return
      }

      // Most-recent active subscription. Mirrors the server-side query in
      // lib/auth/tier.ts so client and server agree on tier state.
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("tier, tier_rank")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subError) throw subError

      if (!mountedRef.current) return

      if (!subscription) {
        setTier(null)
        setTierRank(0)
        return
      }

      setTier(subscription.tier as ProductTier)
      setTierRank(subscription.tier_rank as 1 | 2 | 3)
    } catch (e) {
      if (!mountedRef.current) return
      setError(e instanceof Error ? e : new Error(String(e)))
      setTier(null)
      setTierRank(0)
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void fetchTier()

    // Re-fetch on auth state changes. Logout drops tier to null/0; login
    // (or token refresh after a tier change) refreshes the row.
    const supabase = supabaseRef.current
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void fetchTier()
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [fetchTier])

  return {
    tier,
    tierRank,
    isLoading,
    error,
    refresh: fetchTier,
  }
}
