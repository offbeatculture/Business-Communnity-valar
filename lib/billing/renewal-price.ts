import type { SupabaseClient } from "@supabase/supabase-js"
import { SINGLE_PLAN } from "@/lib/plans"

/** Prices a member can be locked at. Anything else renews at the current price. */
const RENEWAL_PRICES_PAISE = new Set([99900, 149900])

/**
 * What this member pays to renew: their own locked price (₹999 members stay
 * at ₹999), read from their latest subscription row. Used by both the /renew
 * page and the order it creates, so the price shown is the price charged.
 */
export async function getRenewalPricePaise(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("subscriptions")
    .select("locked_price_paise")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const locked = Number(data?.locked_price_paise)
  return RENEWAL_PRICES_PAISE.has(locked) ? locked : SINGLE_PLAN.amountPaise
}
