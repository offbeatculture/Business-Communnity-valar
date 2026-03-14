import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MemberLevel, DailyPrompt, WeeklyHighlights, AwardPointsResult, RecordVisitResult } from '@/types'

// --- Read functions (use user's supabase client) ---

export async function fetchMemberLevel(userId: string): Promise<MemberLevel | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('member_levels')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export async function fetchTodayPrompt(): Promise<DailyPrompt | null> {
  const supabase = await createClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) // YYYY-MM-DD in IST
  const { data } = await supabase
    .from('daily_prompts')
    .select('*')
    .eq('scheduled_date', today)
    .eq('is_active', true)
    .maybeSingle()
  return data
}

export async function fetchPromptResponseCount(promptId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('prompt_id', promptId)
  return count ?? 0
}

export async function hasUserRespondedToPrompt(userId: string, promptId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('id')
    .eq('user_id', userId)
    .eq('prompt_id', promptId)
    .maybeSingle()
  return !!data
}

// --- Write functions (use admin client for SECURITY DEFINER RPCs) ---

export async function awardPoints(
  userId: string,
  action: string,
  gp: number,
  referenceId?: string
): Promise<AwardPointsResult> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('award_points', {
    p_user_id: userId,
    p_action: action,
    p_gp: gp,
    p_reference_id: referenceId ?? null,
  })
  if (error) {
    console.error('award_points RPC error:', error)
    return { gp_earned: 0, total_gp: 0, new_level: 1, capped: true }
  }
  return data as AwardPointsResult
}

export async function recordVisit(userId: string): Promise<RecordVisitResult> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('record_daily_visit', {
    p_user_id: userId,
  })
  if (error) {
    console.error('record_daily_visit RPC error:', error)
    return { already_visited: true, current_streak: 0, total_gp: 0 }
  }
  return data as RecordVisitResult
}

export async function fetchWeeklyHighlights(): Promise<WeeklyHighlights> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_weekly_highlights')
  if (error) {
    console.error('get_weekly_highlights RPC error:', error)
    return { most_helpful: [], top_responders: [], rising_star: null }
  }
  return data as WeeklyHighlights
}
