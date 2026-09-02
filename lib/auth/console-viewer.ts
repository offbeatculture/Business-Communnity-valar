import { createClient } from "@/lib/supabase/server"
import {
  canAccessConsole,
  isConsoleRole,
  type ConsoleRole,
} from "@/lib/auth/console"

// Resolving the signed-in console user. Server-only: it reads cookies via the
// Supabase server client, which middleware's edge runtime cannot do. The
// policy itself lives in ./console so both runtimes share one definition.

export type ConsoleViewer = {
  userId: string
  role: ConsoleRole
  isAdmin: boolean
  isStaff: boolean
  fullName: string | null
  email: string | null
}

/** The signed-in admin or staff user, or null if the caller is neither. */
export async function getConsoleViewer(): Promise<ConsoleViewer | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("user_id", user.id)
    .single()

  const role = profile?.role
  if (!isConsoleRole(role) || !canAccessConsole(role)) return null

  return {
    userId: user.id,
    role,
    isAdmin: role === "admin",
    isStaff: role === "staff",
    fullName: profile?.full_name ?? null,
    email: user.email ?? null,
  }
}

/**
 * Guard for console route handlers. Returns the viewer, or the response to
 * send back.
 *
 * Every guarded route re-checks server-side: hiding a nav item stops nobody
 * from typing the URL.
 */
export async function requireConsole(pathname?: string) {
  const viewer = await getConsoleViewer()

  if (!viewer) {
    return { ok: false as const, status: 403, error: "Console access required" }
  }

  if (pathname) {
    const { canAccessPath } = await import("@/lib/auth/console")
    if (!canAccessPath(viewer.role, pathname)) {
      return { ok: false as const, status: 403, error: "Not permitted for your role" }
    }
  }

  return { ok: true as const, viewer }
}
