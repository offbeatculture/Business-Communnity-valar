import Link from "next/link"
import { requireBillingAdmin } from "@/lib/billing/page-guard"
import { loadBillingData } from "@/lib/billing/data"
import { createAdminClient } from "@/lib/supabase/admin"
import { fmt, rupees } from "@/lib/billing/reconcile"
import { CircleAlert, ExternalLink, ShoppingCart, UserCheck } from "lucide-react"
import { DataTable, PageHeader, Panel, Pill, StatCard, StatGrid } from "@/components/admin/billing/ui"

export const dynamic = "force-dynamic"

type Session = {
  email: string
  status: string
  razorpay_subscription_id: string | null
  created_at: string
  updated_at: string | null
  user_id: string | null
}

export default async function BillingCheckoutsPage() {
  await requireBillingAdmin()
  const admin = createAdminClient()

  const [{ rows, plans }, sessionsRes, subsRes] = await Promise.all([
    loadBillingData(),
    admin
      .from("onboarding_sessions")
      .select("email, status, razorpay_subscription_id, created_at, updated_at, user_id")
      .order("created_at", { ascending: false })
      .limit(2000),
    admin
      .from("rzp_subscriptions")
      .select("id, plan_id, status, email, contact, customer_name, created_at, short_url")
      .order("created_at", { ascending: false }),
  ])

  const sessions = (sessionsRes.data ?? []) as Session[]
  const sessionBySub = new Map(sessions.filter((s) => s.razorpay_subscription_id).map((s) => [s.razorpay_subscription_id!, s]))
  const planById = new Map(plans.map((p) => [p.id, p]))

  // Who is a member today, and whether they currently have access.
  const accessByEmail = new Map<string, string>()
  for (const r of rows) if (r.member) accessByEmail.set(r.member.email, r.access)

  // A. Paid, but the account was never created.
  const paidNoAccount = sessions.filter((s) => s.status === "paid")

  // B. Started a Lifinity checkout and never completed it.
  const abandoned = (subsRes.data ?? [])
    .filter((s) => planById.get(s.plan_id as string)?.is_lifinity && s.status === "created")
    .map((s) => {
      const session = sessionBySub.get(s.id as string)
      const email = ((s.email as string | null) ?? session?.email ?? "").toLowerCase() || null
      return {
        id: s.id as string,
        email,
        name: s.customer_name as string | null,
        phone: s.contact as string | null,
        created: s.created_at as string,
        plan: planById.get(s.plan_id as string),
        link: s.short_url as string | null,
        nowMember: email ? accessByEmail.get(email) : undefined,
      }
    })

  const stillOpen = abandoned.filter((a) => a.nowMember !== "active")

  const accessPill = (email: string) => {
    const a = accessByEmail.get(email.toLowerCase())
    if (!a) return <Pill tone="bad">No account</Pill>
    return <Pill tone={a === "active" ? "good" : "warn"}>{a === "active" ? "Has access" : a === "lapsed" ? "Account, lapsed" : "Account, no access"}</Pill>
  }
  const paidStillMissing = paidNoAccount.filter((s) => accessByEmail.get(s.email.toLowerCase()) !== "active").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unfinished Checkouts"
        description="People who started paying for Lifinity but didn't get all the way through, so you can follow up."
      />

      <StatGrid cols={3}>
        <StatCard
          icon={CircleAlert}
          label="Paid, setup unfinished"
          value={paidNoAccount.length}
          tone={paidStillMissing ? "bad" : "good"}
          hint={paidStillMissing ? `${paidStillMissing} still without access` : "All have access now"}
        />
        <StatCard icon={ShoppingCart} label="Started, never paid" value={stillOpen.length} tone={stillOpen.length ? "warn" : "neutral"} />
        <StatCard
          icon={UserCheck}
          label="Came back and joined later"
          value={abandoned.length - stillOpen.length}
          tone="good"
        />
      </StatGrid>

      <Panel
        flush
        title="Paid, but their account was never set up"
        description="The checkout reached “paid” but stopped before the account was created. Check these first: they may have paid and got nothing."
      >
        <DataTable
          emptyIcon={UserCheck}
          empty="None. Every paid checkout became an account."
          head={["Started", "Email", "Account now", "Razorpay subscription"]}
          rows={paidNoAccount.map((s) => [
            <span key="d" className="whitespace-nowrap">{fmt(s.created_at)}</span>,
            <span key="e" className="font-medium">{s.email}</span>,
            accessPill(s.email),
            s.razorpay_subscription_id ? (
              <Link key="l" href={`/admin/billing/lookup?q=${s.razorpay_subscription_id}`} className="font-mono text-xs text-primary hover:underline">
                {s.razorpay_subscription_id}
              </Link>
            ) : (
              <span key="l" className="text-muted-foreground">—</span>
            ),
          ])}
        />
      </Panel>

      <Panel
        flush
        title="Started, never paid"
        description="Opened a Lifinity checkout, never finished, and aren't an active member now. Each has a Razorpay link they can use to finish paying."
      >
        <DataTable
          emptyIcon={ShoppingCart}
          empty="No unfinished checkouts."
          head={["Started", "Email", "Name / phone", "Plan", "Payment link"]}
          rows={stillOpen.map((a) => [
            <span key="d" className="whitespace-nowrap">{fmt(a.created)}</span>,
            <span key="e" className="font-medium">{a.email ?? "unknown"}</span>,
            <span key="n" className="text-muted-foreground">{[a.name, a.phone].filter(Boolean).join(" · ") || "—"}</span>,
            a.plan ? (
              <span key="p" className="whitespace-nowrap">
                {a.plan.name} <span className="text-muted-foreground">· {rupees(a.plan.amount)}</span>
              </span>
            ) : (
              "—"
            ),
            a.link ? (
              <a key="l" href={a.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Open <ExternalLink className="size-3" />
              </a>
            ) : (
              <span key="l" className="text-muted-foreground">—</span>
            ),
          ])}
        />
      </Panel>
    </div>
  )
}
