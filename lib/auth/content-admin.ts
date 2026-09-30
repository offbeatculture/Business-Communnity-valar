import { createClient } from "@/lib/supabase/server"

/**
 * Roles allowed to manage library content.
 *
 * `admin` is a full admin; `recording_admin` is the restricted role that can
 * upload recordings and manage folders but nothing else. Both are accepted
 * wherever recordings or folders are created or edited — the same rule the
 * existing /api/admin/content and /api/admin/content-folders routes apply.
 */
export const CONTENT_ADMIN_ROLES = ["admin", "recording_admin"] as const

export type ContentAdminResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; status: number }

export async function verifyContentAdmin(): Promise<ContentAdminResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: "Unauthorized", status: 401 }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const role = profile?.role as (typeof CONTENT_ADMIN_ROLES)[number] | undefined

  if (!role || !CONTENT_ADMIN_ROLES.includes(role)) {
    return { ok: false, error: "Forbidden", status: 403 }
  }

  return { ok: true, userId: user.id }
}
