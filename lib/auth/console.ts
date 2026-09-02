// Who gets a console, and what it is called.
//
// One place, read by the sidebar, the top bar and the mobile menu, so the
// switch appears identically everywhere rather than being re-derived at
// each of them.
//
// Deliberately free of imports: middleware runs on the edge runtime where
// the Supabase server client and next/headers are unavailable.

export type ConsoleRole = "member" | "admin" | "recording_admin"

export function isConsoleRole(role: string | null | undefined): role is ConsoleRole {
  return role === "member" || role === "admin" || role === "recording_admin"
}

/** Where an admin lands when they switch consoles. */
export const ADMIN_HOME = "/admin/dashboard"

/** Where a member lands when they leave one. */
export const COMMUNITY_HOME = "/dashboard"

/**
 * The console this role can switch into. Null for anyone without one, which
 * is what hides the affordance for ordinary members.
 *
 * recording_admin has exactly one page, so it gets a direct link to that
 * page rather than a whole console shell — dropping someone into an admin
 * chrome where every other item is forbidden is worse than no switch.
 */
export function consoleEntry(role: string | null | undefined) {
  if (role === "admin") {
    return {
      href: ADMIN_HOME,
      label: "Admin Mode",
      title: "Admin Console",
      full: true,
    }
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
