"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { SINGLE_PLAN, type ProductTier } from "@/lib/plans"

export type UseUserTierResult = {
  tier: ProductTier | null
  tierRank: 0 | 1 | 2 | 3
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

const SINGLE_TIER: ProductTier = "membership"

export function useUserTier(): UseUserTierResult {
  const [tier, setTier] = useState<ProductTier | null>(null)
  const [tierRank, setTierRank] = useState<0 | 1 | 2 | 3>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabaseRef = useRef(createClient())
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

      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("expires_at", new Date().toISOString())
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

      setTier(SINGLE_TIER)
      setTierRank(1)
    } catch (e) {
      if (!mountedRef.current) return

      setError(e instanceof Error ? e : new Error(String(e)))
      setTier(null)
      setTierRank(0)
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    void fetchTier()

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