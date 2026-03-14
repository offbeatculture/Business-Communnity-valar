export const GP_VALUES = {
  post: 15,
  prompt_response: 12,
  comment_substantive: 8,    // 50+ chars
  comment_short: 2,          // <50 chars
  like_received: 5,
  comment_received: 4,
  like_given: 1,
  daily_visit: 3,
  content_view: 2,
} as const

export const DAILY_CAPS = {
  post: 2,
  prompt_response: 1,
  comment: 5,             // shared cap for short + substantive
  comment_received: 10,
  like_received: 15,
  like_given: 10,
  daily_visit: 1,
  content_view: 3,
} as const

export const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Seed',       gp: 0,     color: 'gray' },
  { level: 2, name: 'Sprout',     gp: 100,   color: 'green' },
  { level: 3, name: 'Builder',    gp: 500,   color: 'orange' },
  { level: 4, name: 'Grower',     gp: 1500,  color: 'amber' },
  { level: 5, name: 'Scaler',     gp: 4000,  color: 'red' },
  { level: 6, name: 'Leader',     gp: 10000, color: 'red-gradient' },
  { level: 7, name: 'Pathfinder', gp: 25000, color: 'gold-gradient' },
] as const

export const STREAK_COLORS = {
  0: 'gray',
  1: 'orange',    // 1-6
  7: 'red',       // 7-29
  30: 'purple',   // 30-99
  100: 'gold',    // 100+
} as const

export const COMMENT_SUBSTANTIVE_LENGTH = 50

export function getLevelInfo(level: number) {
  return LEVEL_THRESHOLDS.find(l => l.level === level) ?? LEVEL_THRESHOLDS[0]
}

export function getLevelForGP(gp: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (gp >= LEVEL_THRESHOLDS[i].gp) return LEVEL_THRESHOLDS[i]
  }
  return LEVEL_THRESHOLDS[0]
}

export function getNextLevel(currentLevel: number) {
  return LEVEL_THRESHOLDS.find(l => l.level === currentLevel + 1) ?? null
}

export function getStreakColor(streak: number): string {
  if (streak >= 100) return 'gold'
  if (streak >= 30) return 'purple'
  if (streak >= 7) return 'red'
  if (streak >= 1) return 'orange'
  return 'gray'
}
