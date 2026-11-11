import "server-only"

import { createClient } from "@/lib/supabase/server"
import { karmaRecodeFolderIds } from "@/lib/folder-tree"

// Karma Recode: buyers get Lifinity plus a members-only "Karma Recode" tab
// for one year from purchase. Purchases before 1 June 2026 count from
// 1 June 2026.
//
// The database is the real gate (see 20261111_karma_recode.sql): Karma
// Recode videos are unreadable to anyone else. This file decides what the
// pages show.

export { karmaRecodeExpiry, KARMA_RECODE_EARLIEST_START } from "@/lib/karma-recode-dates"

export type KarmaRecodeAccess = {
  /** Can open the tab: a current Karma Recode member, or on the team. */
  canView: boolean
  /** Has (or had) Karma Recode themselves. */
  member: { expiresAt: string; active: boolean } | null
  isTeam: boolean
}

export async function getKarmaRecodeAccess(): Promise<KarmaRecodeAccess> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { canView: false, member: null, isTeam: false }

  const [{ data: profile }, { data: row }] = await Promise.all([
    supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle(),
    // RLS lets a member read only their own row.
    supabase.from("karma_recode_members").select("expires_at").maybeSingle(),
  ])

  const isTeam = ["admin", "recording_admin", "staff"].includes(profile?.role ?? "")
  const member = row
    ? { expiresAt: row.expires_at as string, active: new Date(row.expires_at as string).getTime() > Date.now() }
    : null

  return { canView: isTeam || !!member?.active, member, isTeam }
}

/**
 * Ids of every Karma Recode folder. Used to keep Karma Recode videos out of
 * the normal library, the dashboard and search, even for people who can
 * watch them — they live in their own tab.
 */
export async function fetchKarmaRecodeFolderIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("content_folders")
    .select("id, name, parent_id, sort_order, created_at, is_karma_recode")
  if (error) {
    // Column missing = migration not run yet = nothing is Karma Recode.
    return []
  }
  return [...karmaRecodeFolderIds(data ?? [])]
}

/**
 * PostgREST filter that keeps videos outside Karma Recode folders. Videos
 * with no folder stay in: `not.in` alone would drop NULLs.
 */
export function outsideKarmaRecode(ids: string[]): string | null {
  return ids.length ? `folder_id.is.null,folder_id.not.in.(${ids.join(",")})` : null
}
