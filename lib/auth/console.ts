// Who gets a console, what it is called, and what they may open inside it.
//
// One place, read by the sidebar, the top bar, the layouts and every guarded
// route handler. Hiding a nav item is presentation, not security — a staff
// member can still type the URL and the API behind it answers to anyone — so
// the same list gates the server too.
//
// Deliberately free of imports: middleware runs on the edge runtime, where
// the Supabase server client and next/headers are unavailable.

export type ConsoleRole = "member" | "staff" | "recording_admin" | "admin"

export function isConsoleRole(role: string | null | undefined): role is ConsoleRole {
  return (
    role === "member" ||
    role === "staff" ||
    role === "recording_admin" ||
    role === "admin"
  )
}

/** Roles that get a console shell at all. */
export function canAccessConsole(role: string | null | undefined): boolean {
  return role === "admin" || role === "staff"
}

export const ADMIN_HOME = "/admin/dashboard"
export const STAFF_HOME = "/admin/staff"
export const COMMUNITY_HOME = "/dashboard"

/**
 * Paths staff may not open. Prefix match, so children are covered.
 *
 * Revenue and member creation are the two lines. Staff answer questions and
 * chase follow-ups; they do not see what the community earns, and they do not
 * mint accounts.
 */
export const STAFF_BLOCKED_PATHS = [
  "/admin/dashboard",
  "/admin/members/create",
  "/admin/temp-password",
] as const

/** API routes staff may not call, matched the same way. */
export const STAFF_BLOCKED_API = [
  "/api/admin/stats",
  "/api/admin/members/create",
  "/api/admin/temp-password",
] as const

function matches(pathname: string, list: readonly string[]) {
  return list.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

/**
 * Whether a role may open a console path.
 *
 * `/admin` is an exact-match denial rather than a prefix entry: a prefix
 * would lock staff out of the entire console.
 */
export function canAccessPath(role: string | null | undefined, pathname: string) {
  if (role === "admin") return true
  if (role !== "staff") return false

  if (pathname === "/admin") return false
  if (matches(pathname, STAFF_BLOCKED_PATHS)) return false
  if (matches(pathname, STAFF_BLOCKED_API)) return false

  return true
}

/**
 * The console this role can switch into. Null for anyone without one, which
 * is what hides the affordance for ordinary members.
 *
 * recording_admin gets a direct link to its one page rather than a console
 * shell — dropping someone into admin chrome where every other item is
 * forbidden is worse than offering no switch.
 */
export function consoleEntry(role: string | null | undefined) {
  if (role === "admin") {
    return { href: ADMIN_HOME, label: "Admin Mode", title: "Admin Console", full: true }
  }

  if (role === "staff") {
    return { href: STAFF_HOME, label: "Support Portal", title: "Support Portal", full: true }
  }

  if (role === "recording_admin") {
    return {
      href: "/upload-recording",
      label: "Upload Recording",
      title: "Recording Access",
      full: false,
    }
  }

  return null
}
