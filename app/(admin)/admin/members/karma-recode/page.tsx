import { CalendarClock, CircleAlert, Sparkles, UserX } from "lucide-react"
import { requireBillingAdmin } from "@/lib/billing/page-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { Callout, PageHeader, StatCard, StatGrid } from "@/components/admin/billing/ui"
import { KarmaRecodeManager, type KrRow } from "@/components/admin/KarmaRecodeManager"

export const dynamic = "force-dynamic"

export default async function KarmaRecodeMembersPage() {
  await requireBillingAdmin()
  const admin = createAdminClient()
  const nowMs = new Date().getTime()

  const { data: list, error } = await admin
    .from("karma_recode_members")
    .select("email, name, phone, purchased_on, expires_at, created_at")
    .order("purchased_on", { ascending: true, nullsFirst: true })

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="Karma Recode" description="Who has Karma Recode, and until when." />
        <Callout tone="bad" icon={CircleAlert} title="The Karma Recode tables don't exist yet">
          Run <code>supabase/migrations/20261111_karma_recode.sql</code> in the Supabase SQL editor. ({error.message})
        </Callout>
      </div>
    )
  }

  // Accounts and their current membership, to show who can actually get in.
  const users: { id: string; email?: string; last_sign_in_at?: string }[] = []
  for (let page = 1; ; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    users.push(...(data?.users ?? []))
    if (!data || data.users.length < 1000) break
  }
  const userByEmail = new Map(users.map((u) => [u.email?.toLowerCase(), u]))
  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, plan_label, expires_at")
    .eq("status", "active")
  const subByUser = new Map((subs ?? []).map((s) => [s.user_id as string, s]))

  const rows: KrRow[] = (list ?? []).map((k) => {
    const u = userByEmail.get(k.email)
    const s = u ? subByUser.get(u.id) : undefined
    return {
      email: k.email,
      name: k.name,
      phone: k.phone,
      purchasedOn: k.purchased_on,
      expiresAt: k.expires_at,
      active: new Date(k.expires_at).getTime() > nowMs,
      hasAccount: !!u,
      lastSignIn: u?.last_sign_in_at ?? null,
      membershipLabel: (s?.plan_label as string | undefined) ?? null,
      membershipEnds: (s?.expires_at as string | undefined) ?? null,
    }
  })

  const active = rows.filter((r) => r.active).length
  const noAccount = rows.filter((r) => !r.hasAccount).length
  const soon = rows.filter((r) => r.active && new Date(r.expiresAt).getTime() - nowMs < 30 * 86400000).length

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Karma Recode"
        description="Who has Karma Recode, and until when. They get Lifinity plus the Karma Recode tab for a year from purchase. Purchases before 1 June 2026 count from 1 June 2026."
      />

      <StatGrid>
        <StatCard icon={Sparkles} label="Karma Recode members" value={rows.length} hint={`${active} with access today`} />
        <StatCard icon={CalendarClock} label="Ending in 30 days" value={soon} tone={soon ? "warn" : "neutral"} />
        <StatCard icon={UserX} label="No account yet" value={noAccount} tone={noAccount ? "bad" : "good"} hint={noAccount ? "Create their account to give access" : "Everyone can log in"} />
        <StatCard icon={CircleAlert} label="Access ended" value={rows.length - active} tone="neutral" />
      </StatGrid>

      <KarmaRecodeManager rows={rows} />
    </div>
  )
}
