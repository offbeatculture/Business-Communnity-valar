import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// ════════════════════════════════════════════════════════════
// Admin action audit trail
//
// Anything an admin does TO a member — extending access, revoking it,
// resending a login, creating an account — leaves a row. Without it,
// "why does this member have access until March?" has no answer.
// ════════════════════════════════════════════════════════════

export type AdminAuthResult =
  | { ok: true; userId: string; email: string | null }
  | { ok: false; status: number; error: string }

/**
 * Confirms the caller is an authenticated admin, and returns their
 * identity so callers can attribute the audit row.
 *
 * Every admin route re-checks server-side. Hiding a nav item is
 * presentation, not security — the URL is still typeable.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return { ok: false, status: 403, error: "Admin access required" }
  }

  return { ok: true, userId: user.id, email: user.email ?? null }
}

export type AdminActionInput = {
  adminUserId: string
  adminEmail?: string | null
  targetUserId?: string | null
  targetProfileId?: string | null
  action: string
  detail?: Record<string, unknown> | null
  note?: string | null
}

/**
 * Best-effort audit write. Deliberately never throws: a failure to record
 * what happened must not roll back the thing that happened, or an admin
 * would see "extend failed" for an extension that actually succeeded.
 */
export async function logAdminAction(input: AdminActionInput): Promise<void> {
  try {
    const admin = createAdminClient()

    await admin.from("admin_actions").insert({
      admin_user_id: input.adminUserId,
      admin_email: input.adminEmail ?? null,
      target_user_id: input.targetUserId ?? null,
      target_profile_id: input.targetProfileId ?? null,
      action: input.action,
      detail: input.detail ?? null,
      note: input.note ?? null,
    })
  } catch (err) {
    console.error("logAdminAction failed (non-blocking):", err)
  }
}

/** The recent trail for one member, newest first. */
export async function fetchMemberActions(userId: string, limit = 20) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("admin_actions")
    .select("*")
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  return data ?? []
}
