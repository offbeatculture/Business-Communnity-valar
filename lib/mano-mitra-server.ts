import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { ManoMitraSession } from "@/lib/mano-mitra"

/** Intensity at or above this after a session counts as "still high". */
const HIGH_INTENSITY = 7
const LOOKBACK_DAYS = 30

/**
 * How many times in the last 30 days this member finished a session still
 * at a high intensity.
 *
 * One hard session is normal. A pattern of them is the signal that a
 * breathing exercise is not the right level of care, and the post-check
 * escalates to professional support.
 */
export async function fetchHighIntensityCount(userId: string): Promise<number> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()

  const { count } = await admin
    .from("mano_mitra_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since)
    .gte("intensity_after", HIGH_INTENSITY)

  return count ?? 0
}

/** A member's own session history. RLS restricts this to their own rows. */
export async function fetchManoMitraHistory(
  userId: string,
  limit = 30
): Promise<ManoMitraSession[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("mano_mitra_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  return (data ?? []) as ManoMitraSession[]
}
