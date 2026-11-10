import Link from "next/link"
import { requireBillingAdmin } from "@/lib/billing/page-guard"
import { loadBillingData } from "@/lib/billing/data"
import { createAdminClient } from "@/lib/supabase/admin"
import { fmt, rupees } from "@/lib/billing/reconcile"

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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">Billing</p>
        <h1 className="mt-1 text-2xl font-bold">Unfinished Checkouts</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          People who started paying for Lifinity and didn&apos;t get all the way through — for follow-up. Each
          unfinished Razorpay checkout has its own payment link they can use to finish.
        </p>
      </div>

      <section>
        <h2 className="text-base font-semibold">Paid, but their account was never set up ({paidNoAccount.length})</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          The checkout reached “paid” but stopped before the account was created. Check these first — they may have
          paid and received nothing.
        </p>
        <Table
          head={["Started", "Email", "Account now?", "Razorpay subscription"]}
          rows={paidNoAccount.map((s) => [
            fmt(s.created_at),
            s.email,
            accessByEmail.has(s.email.toLowerCase())
              ? `Yes — ${accessByEmail.get(s.email.toLowerCase())}`
              : "No account",
            s.razorpay_subscription_id ? (
              <Link key="l" href={`/admin/billing/lookup?q=${s.razorpay_subscription_id}`} className="font-mono text-primary hover:underline">
                {s.razorpay_subscription_id}
              </Link>
            ) : (
              "—"
            ),
          ])}
          empty="None — every paid checkout became an account."
        />
      </section>

      <section>
        <h2 className="text-base font-semibold">Started, never paid ({stillOpen.length})</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Opened a Lifinity checkout but never completed it, and aren&apos;t an active member now.
          {abandoned.length > stillOpen.length && ` (${abandoned.length - stillOpen.length} more later joined and are hidden.)`}
        </p>
        <Table
          head={["Started", "Email", "Name / phone", "Plan", "Payment link"]}
          rows={stillOpen.map((a) => [
            fmt(a.created),
            a.email ?? "unknown",
            [a.name, a.phone].filter(Boolean).join(" · ") || "—",
            a.plan ? `${a.plan.name} (${rupees(a.plan.amount)})` : "—",
            a.link ? (
              <a key="l" href={a.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                Open link
              </a>
            ) : (
              "—"
            ),
          ])}
          empty="No unfinished checkouts. (Press Sync now on Reconciliation if this looks wrong.)"
        />
      </section>
    </div>
  )
}

function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <p className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            {head.map((h) => (
              <th key={h} className="p-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border/60">
              {r.map((c, j) => (
                <td key={j} className="p-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
