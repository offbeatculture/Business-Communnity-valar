import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

/** One row of the admin member table: everything needed to filter and act. */
export type MemberRow = {
  profileId: string
  userId: string
  name: string
  email: string | null
  phone: string | null
  role: string
  joinedAt: string
  lastSignIn: string | null
  /** Has finished setting their own password. */
  passwordSet: boolean
  plan: string | null
  /** Rupees per month they are locked at, when recorded. */
  lockedPrice: number | null
  /** active = can get in now; expired = had one; none = never had one. */
  access: "active" | "expired" | "none"
  endsAt: string | null
  /** on = Razorpay renews it; cancelled = will stop at the end; manual = no autopay. */
  autoRenew: "on" | "cancelled" | "manual"
  krUntil: string | null
  krActive: boolean
}

/**
 * Every account with its current membership, Karma Recode status and last
 * login, in one pass. The community is a few hundred people, so the table
 * loads them all and filters in the browser — instant, and every filter
 * combines with every other.
 */
export async function loadMemberDirectory(): Promise<MemberRow[]> {
  const admin = createAdminClient()
  const now = Date.now()

  const users: { id: string; email?: string; last_sign_in_at?: string }[] = []
  for (let page = 1; ; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    users.push(...(data?.users ?? []))
    if (!data || data.users.length < 1000) break
  }
  const userById = new Map(users.map((u) => [u.id, u]))

  const [{ data: profiles }, { data: subs }, kr] = await Promise.all([
    admin
      .from("profiles")
      .select("id, user_id, full_name, phone, role, created_at, password_set")
      .order("created_at", { ascending: false }),
    admin
      .from("subscriptions")
      .select("user_id, plan_label, plan_name, status, expires_at, recurring_status, locked_price_paise")
      .order("expires_at", { ascending: false }),
    // The Karma Recode table may not exist on an old database; carry on without it.
    admin.from("karma_recode_members").select("email, expires_at"),
  ])

  type Sub = NonNullable<typeof subs>[number]
  const isLive = (s: Sub) => s.status === "active" && new Date(s.expires_at).getTime() >= now

  // Prefer the membership that is giving access now; otherwise the latest one.
  const subByUser = new Map<string, Sub>()
  for (const s of subs ?? []) {
    const current = subByUser.get(s.user_id)
    if (!current || (!isLive(current) && isLive(s))) subByUser.set(s.user_id, s)
  }

  const krByEmail = new Map((kr.data ?? []).map((k) => [k.email as string, k.expires_at as string]))

  return (profiles ?? []).map((p) => {
    const user = userById.get(p.user_id)
    const email = user?.email?.toLowerCase() ?? null
    const sub = subByUser.get(p.user_id)
    const krUntil = email ? krByEmail.get(email) ?? null : null

    const recurring = sub?.recurring_status
    const autoRenew: MemberRow["autoRenew"] =
      recurring === "active" ? "on" : recurring === "cancelled" ? "cancelled" : "manual"

    return {
      profileId: p.id,
      userId: p.user_id,
      name: p.full_name || email || "Unnamed",
      email,
      phone: p.phone ?? null,
      role: p.role ?? "member",
      joinedAt: p.created_at,
      lastSignIn: user?.last_sign_in_at ?? null,
      passwordSet: p.password_set !== false,
      plan: sub ? sub.plan_label || sub.plan_name || "Membership" : null,
      lockedPrice: sub?.locked_price_paise != null ? Math.round(sub.locked_price_paise / 100) : null,
      access: !sub ? "none" : isLive(sub) ? "active" : "expired",
      endsAt: sub?.expires_at ?? null,
      autoRenew: sub ? autoRenew : "manual",
      krUntil,
      krActive: !!krUntil && new Date(krUntil).getTime() > now,
    }
  })
}
