// ════════════════════════════════════════════════════════════
// Daily Practice Check-in — dates, streaks, leaderboard windows
//
// Pure + deterministic. No fetch, no DB. Everything is reasoned in
// Asia/Kolkata, because that is the day boundary award_points() and
// record_daily_visit() already use — mixing in UTC would hand members
// a second check-in between 18:30 and midnight IST.
// ════════════════════════════════════════════════════════════

export const IST_TIMEZONE = "Asia/Kolkata"

/** 4 for showing up, +2 for each practice actually done. */
export const CHECKIN_BASE_GP = 4
export const CHECKIN_PER_YES_GP = 2

export function checkinGP(yesCount: number): number {
  return CHECKIN_BASE_GP + CHECKIN_PER_YES_GP * Math.max(0, yesCount)
}

// ─── IST dates ──────────────────────────────────────────────

/** Today in IST as YYYY-MM-DD. */
export function istToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/** Shift a YYYY-MM-DD string by whole days, staying calendar-correct. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

// ─── Streaks ────────────────────────────────────────────────

export type StreakInfo = {
  current: number
  longest: number
  /** Already logged today. */
  checkedInToday: boolean
  /**
   * Logged yesterday but not yet today — the streak is alive but at
   * risk. Drives the gentle nudge rather than a "you lost it" message.
   */
  atRisk: boolean
}

/**
 * Count consecutive days ending today, or ending yesterday when today
 * has not been logged yet.
 *
 * A member who checks in Mon–Fri and opens the app on Saturday morning
 * still has a 5-day streak; it only breaks once Saturday passes unlogged.
 * Counting strictly to today would show "0" every morning before they
 * check in, which reads as punishment for waking up.
 */
export function computeStreak(
  dates: string[],
  today: string = istToday()
): StreakInfo {
  const set = new Set(dates)
  const checkedInToday = set.has(today)
  const yesterday = addDays(today, -1)

  let current = 0
  if (checkedInToday || set.has(yesterday)) {
    let cursor = checkedInToday ? today : yesterday
    while (set.has(cursor)) {
      current += 1
      cursor = addDays(cursor, -1)
    }
  }

  // Longest run anywhere in the history.
  const sorted = [...set].sort()
  let longest = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    run = prev !== null && daysBetween(prev, d) === 1 ? run + 1 : 1
    if (run > longest) longest = run
    prev = d
  }

  return {
    current,
    longest: Math.max(longest, current),
    checkedInToday,
    atRisk: !checkedInToday && current > 0,
  }
}

// ─── Leaderboard week ───────────────────────────────────────

export type WeekWindow = {
  /** Monday, YYYY-MM-DD, IST. */
  start: string
  /** Sunday, YYYY-MM-DD, IST — inclusive. */
  end: string
  label: string
}

/**
 * Monday → Sunday, in IST.
 *
 * Deliberately Monday-start so the week CLOSES on Sunday. The weekly
 * call is Sunday 10:30, which lands near the end of the current week —
 * standings are effectively final when Valar reads them out, and the
 * call celebrates the week that is finishing rather than one that
 * ended two days earlier.
 *
 * `offset` steps whole weeks: 0 = this week, -1 = last week.
 */
export function weekWindow(
  offset = 0,
  today: string = istToday()
): WeekWindow {
  const [y, m, d] = today.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))

  // getUTCDay: 0=Sun … 6=Sat. Days since Monday.
  const sinceMonday = (dt.getUTCDay() + 6) % 7

  const start = addDays(today, -sinceMonday + offset * 7)
  const end = addDays(start, 6)

  return { start, end, label: labelForWeek(offset) }
}

function labelForWeek(offset: number): string {
  if (offset === 0) return "This week"
  if (offset === -1) return "Last week"
  return `${Math.abs(offset)} weeks ago`
}

export function formatWeekRange(win: WeekWindow): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    })
  return `${fmt(win.start)} – ${fmt(win.end)}`
}

// ─── Types shared with the UI ───────────────────────────────

export type CheckinQuestion = {
  id: string
  question_text: string
  week_number: number | null
  sort_order: number
  is_active: boolean
}

export type DailyCheckin = {
  id: string
  user_id: string
  checkin_date: string
  answers: Record<string, boolean>
  yes_count: number
  total_count: number
  created_at: string
  updated_at: string
}

export type LeaderboardRow = {
  rank: number
  userId: string
  name: string
  points: number
  isCurrentUser: boolean
}
