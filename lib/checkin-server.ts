import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  computeStreak,
  istToday,
  weekWindow,
  type CheckinQuestion,
  type DailyCheckin,
  type LeaderboardRow,
  type StreakInfo,
  type WeekWindow,
} from "@/lib/checkin"

/** How far back the streak calculation looks. */
const STREAK_LOOKBACK_DAYS = 400

/**
 * The questions shown today. Week-scoped questions win when a week is
 * active; otherwise the standing set (week_number IS NULL) is used.
 */
export async function fetchCheckinQuestions(
  weekNumber?: number | null
): Promise<CheckinQuestion[]> {
  const supabase = await createClient()

  if (weekNumber) {
    const { data } = await supabase
      .from("checkin_questions")
      .select("*")
      .eq("is_active", true)
      .eq("week_number", weekNumber)
      .order("sort_order", { ascending: true })

    if (data && data.length > 0) return data as CheckinQuestion[]
  }

  const { data } = await supabase
    .from("checkin_questions")
    .select("*")
    .eq("is_active", true)
    .is("week_number", null)
    .order("sort_order", { ascending: true })

  return (data ?? []) as CheckinQuestion[]
}

export async function fetchTodayCheckin(
  userId: string
): Promise<DailyCheckin | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("checkin_date", istToday())
    .maybeSingle()

  return data as DailyCheckin | null
}

export async function fetchStreak(userId: string): Promise<StreakInfo> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("daily_checkins")
    .select("checkin_date")
    .eq("user_id", userId)
    .gte("checkin_date", addDaysIso(istToday(), -STREAK_LOOKBACK_DAYS))
    .order("checkin_date", { ascending: false })

  const dates = (data ?? []).map((r) => r.checkin_date as string)
  return computeStreak(dates)
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export async function submitCheckin(
  userId: string,
  answers: Record<string, boolean>
) {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("submit_daily_checkin", {
    p_user_id: userId,
    p_answers: answers,
  })

  if (error) {
    console.error("submit_daily_checkin RPC error:", error)
    throw new Error("Could not save your check-in")
  }

  return data as {
    checkin_date: string
    yes_count: number
    total_count: number
    first_today: boolean
    award: { gp_earned: number; capped: boolean }
  }
}

/** Every logged day for one member, newest first. Powers the history view. */
export async function fetchCheckinHistory(
  userId: string,
  days = 120
): Promise<DailyCheckin[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("checkin_date", addDaysIso(istToday(), -days))
    .order("checkin_date", { ascending: false })

  return (data ?? []) as DailyCheckin[]
}

export type MemberWeek = {
  userId: string
  name: string
  isAdmin: boolean
  /** Logged dates inside the window, ascending. */
  dates: string[]
  daysLogged: number
  /** Yes-answers summed across the week. */
  totalYes: number
  /** Yes-answers per question id. */
  yesByQuestion: Record<string, number>
  currentStreak: number
}

export type WeeklyReview = {
  window: WeekWindow
  questions: CheckinQuestion[]
  members: MemberWeek[]
  /** Members with a profile who logged nothing in the window. */
  silent: MemberWeek[]
  totalMembers: number
}

/**
 * The screen Valar opens during the Sunday call: who practised, what they
 * actually did, and who has gone quiet.
 *
 * Deliberately includes members with zero check-ins — the people worth
 * calling out are usually the ones missing from a leaderboard, not the
 * ones at the top of it.
 */
export async function fetchWeeklyReview(offset = 0): Promise<WeeklyReview> {
  const admin = createAdminClient()
  const win = weekWindow(offset)

  const [profileRes, checkinRes, questions] = await Promise.all([
    admin.from("profiles").select("user_id, full_name, role"),
    admin
      .from("daily_checkins")
      .select("user_id, checkin_date, answers, yes_count")
      .gte("checkin_date", win.start)
      .lte("checkin_date", win.end),
    fetchCheckinQuestions(),
  ])

  if (profileRes.error) console.error("Weekly review profiles error:", profileRes.error)
  if (checkinRes.error) console.error("Weekly review checkins error:", checkinRes.error)

  // Streaks need history beyond the window, so pull a wider slice once
  // rather than issuing a query per member.
  const { data: streakRows } = await admin
    .from("daily_checkins")
    .select("user_id, checkin_date")
    .gte("checkin_date", addDaysIso(win.end, -120))
    .lte("checkin_date", win.end)

  const historyByUser = new Map<string, string[]>()
  for (const row of streakRows ?? []) {
    const list = historyByUser.get(row.user_id as string) ?? []
    list.push(row.checkin_date as string)
    historyByUser.set(row.user_id as string, list)
  }

  const byUser = new Map<string, { dates: string[]; totalYes: number; yesByQuestion: Record<string, number> }>()
  for (const row of checkinRes.data ?? []) {
    const uid = row.user_id as string
    const entry = byUser.get(uid) ?? { dates: [], totalYes: 0, yesByQuestion: {} }
    entry.dates.push(row.checkin_date as string)
    entry.totalYes += (row.yes_count as number) ?? 0

    const answers = (row.answers ?? {}) as Record<string, boolean>
    for (const [qid, value] of Object.entries(answers)) {
      if (value === true) {
        entry.yesByQuestion[qid] = (entry.yesByQuestion[qid] ?? 0) + 1
      }
    }
    byUser.set(uid, entry)
  }

  const all: MemberWeek[] = (profileRes.data ?? [])
    .filter((p) => p.user_id)
    .map((p) => {
      const uid = p.user_id as string
      const entry = byUser.get(uid)
      return {
        userId: uid,
        name: (p.full_name as string) || "Member",
        isAdmin: p.role === "admin",
        dates: (entry?.dates ?? []).sort(),
        daysLogged: entry?.dates.length ?? 0,
        totalYes: entry?.totalYes ?? 0,
        yesByQuestion: entry?.yesByQuestion ?? {},
        currentStreak: computeStreak(historyByUser.get(uid) ?? [], win.end).current,
      }
    })
    .filter((m) => !m.isAdmin)

  const active = all
    .filter((m) => m.daysLogged > 0)
    .sort((a, b) => b.daysLogged - a.daysLogged || b.totalYes - a.totalYes || a.name.localeCompare(b.name))

  const silent = all
    .filter((m) => m.daysLogged === 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    window: win,
    questions,
    members: active,
    silent,
    totalMembers: all.length,
  }
}

/**
 * Points earned inside one Monday→Sunday window, ranked.
 *
 * Reads engagement_log rather than member_levels.total_gp, because the
 * latter is all-time — a weekly board built on it would be frozen in
 * whatever order members joined in.
 */
export async function fetchWeeklyLeaderboard(
  currentUserId: string,
  offset = 0,
  limit = 10
): Promise<{ rows: LeaderboardRow[]; window: WeekWindow; currentUser: LeaderboardRow | null }> {
  const admin = createAdminClient()
  const win = weekWindow(offset)

  const [logRes, profileRes] = await Promise.all([
    admin
      .from("engagement_log")
      .select("user_id, gp_earned")
      .gte("earned_date", win.start)
      .lte("earned_date", win.end),
    admin.from("profiles").select("user_id, full_name, role"),
  ])

  if (logRes.error) console.error("Weekly leaderboard log error:", logRes.error)
  if (profileRes.error) console.error("Weekly leaderboard profile error:", profileRes.error)

  // Staff do not compete with members. Admins post, comment and moderate
  // as part of running the community, which earns them points all week —
  // leaving them in would park them permanently at the top and make the
  // board meaningless as a picture of member practice.
  //
  // Ranking below filters on this map, so leaving an admin out here
  // removes them from the standings AND from their own "you" row.
  const names = new Map<string, string>()
  for (const p of profileRes.data ?? []) {
    if (!p.user_id) continue
    if (p.role === "admin") continue
    names.set(p.user_id, p.full_name || "Member")
  }

  const totals = new Map<string, number>()
  for (const row of logRes.data ?? []) {
    if (!row.user_id) continue
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + (row.gp_earned ?? 0))
  }

  const ranked = [...totals.entries()]
    .filter(([userId]) => names.has(userId))
    .sort((a, b) => b[1] - a[1] || (names.get(a[0]) ?? "").localeCompare(names.get(b[0]) ?? ""))
    .map(([userId, points], i) => ({
      rank: i + 1,
      userId,
      name: names.get(userId) ?? "Member",
      points,
      isCurrentUser: userId === currentUserId,
    }))

  // Always give the member their own standing, even outside the top N,
  // so the board is informative rather than just aspirational.
  const currentUser = ranked.find((r) => r.isCurrentUser) ?? null

  return { rows: ranked.slice(0, limit), window: win, currentUser }
}
