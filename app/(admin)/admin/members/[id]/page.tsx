import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMemberActions } from "@/lib/admin-audit"
import { MemberControlActions } from "@/components/admin/MemberControlActions"
import { formatINR } from "@/lib/plans"
import { ArrowLeft, Mail, MapPin, Building2, Calendar } from "lucide-react"

type Props = { params: Promise<{ id: string }> }

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default async function MemberDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (me?.role !== "admin") redirect("/dashboard")

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!profile) notFound()

  const userId = profile.user_id as string

  const [subsRes, emailRes, levelRes, actions] = await Promise.all([
    admin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin.rpc("get_emails_by_user_ids", { p_ids: [userId] }),
    admin.from("member_levels").select("*").eq("user_id", userId).maybeSingle(),
    fetchMemberActions(userId),
  ])

  const subscriptions = subsRes.data ?? []
  const current = subscriptions[0] ?? null
  const email = Array.isArray(emailRes.data) ? emailRes.data[0]?.email : null
  const level = levelRes.data

  const isActive =
    current &&
    current.status === "active" &&
    new Date(current.expires_at) > new Date() &&
    !["expired", "halted", "completed"].includes(current.recurring_status ?? "")

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-16">
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All members
      </Link>

      {/* Identity */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {profile.full_name || "Unnamed member"}
            </h1>

            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {email && (
                <p className="flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {email}
                </p>
              )}
              {profile.business_name && (
                <p className="flex items-center gap-1.5">
                  <Building2 className="size-3.5" />
                  {profile.business_name}
                </p>
              )}
              {profile.city && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {profile.city}
                </p>
              )}
              <p className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Joined {formatDate(profile.created_at)}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isActive
                ? "bg-green-500/10 text-green-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isActive ? "Active" : "No access"}
          </span>
        </div>

        {profile.role !== "member" && (
          <p className="mt-3 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {profile.role}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h2 className="mb-3 text-base font-semibold">Manage access</h2>
        <MemberControlActions
          profileId={id}
          memberName={profile.full_name?.split(" ")[0] || "this member"}
          hasSubscription={!!current}
        />
      </div>

      {/* Engagement */}
      {level && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Points" value={level.total_gp ?? 0} />
          <Stat label="Level" value={level.current_level ?? 1} />
          <Stat label="Streak" value={level.current_streak ?? 0} />
          <Stat label="Longest streak" value={level.longest_streak ?? 0} />
        </div>
      )}

      {/* Subscription history */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Subscriptions ({subscriptions.length})
        </h2>

        {subscriptions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
            No subscription records. This member has never paid.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Plan</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Started</th>
                  <th className="p-3 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-border/40 last:border-0">
                    <td className="p-3 font-medium">
                      {s.plan_label || s.plan_name}
                    </td>
                    <td className="p-3 tabular-nums">
                      {s.amount_paid ? formatINR(s.amount_paid) : "—"}
                    </td>
                    <td className="p-3">
                      {s.status}
                      {s.recurring_status && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          / {s.recurring_status}
                        </span>
                      )}
                    </td>
                    <td className="p-3">{formatDate(s.starts_at)}</td>
                    <td className="p-3">{formatDate(s.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Audit trail */}
      <section>
        <h2 className="mb-1 text-base font-semibold">Admin activity</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Everything an admin has done to this account.
        </p>

        {actions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
            Nothing recorded yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {actions.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-border/60 bg-card p-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {(a.action as string).replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at as string).toLocaleString("en-IN")}
                  </span>
                </div>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  by {(a.admin_email as string) ?? "an admin"}
                </p>

                {a.note ? (
                  <p className="mt-1.5 text-sm">{a.note as string}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
