import { redirect } from "next/navigation"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { CurrentPlanCard } from "@/components/subscription/CurrentPlanCard"
import { PaymentHistory } from "@/components/subscription/PaymentHistory"
import { RenewButton } from "@/components/subscription/RenewButton"
import { CancelSubscriptionButton } from "@/components/subscription/CancelSubscriptionButton"
import { SINGLE_PLAN, formatINR } from "@/lib/plans"
import type { Subscription, Invoice } from "@/types"

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ""
  return format(new Date(iso), "d MMM yyyy")
}

type SingleSubscriptionRow = Subscription & {
  plan_id?: string | null
  plan_name?: string | null
  plan_label?: string | null
  amount_paid?: number | string | null
  amount_paise?: number | string | null
  locked_price_paise?: number | string | null
  recurring_status?: string | null
  razorpay_subscription_id?: string | null
  starts_at?: string | null
  expires_at?: string | null
  status?: string | null
}

function toPaise(value: number | string | null | undefined): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseInt(value, 10) || 0
  return 0
}

export default async function SubscriptionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single()

  const { data: latestSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const sub = (latestSub as SingleSubscriptionRow | null) ?? null

  const isExpired = !sub?.expires_at || new Date(sub.expires_at) < new Date()
  const isActive = !!sub && sub.status === "active" && !isExpired
  const isCancelling = sub?.recurring_status === "cancelled" && !isExpired
  const isRecurring = !!sub?.razorpay_subscription_id

  const paidPaise =
    toPaise(sub?.locked_price_paise) ||
    toPaise(sub?.amount_paise) ||
    toPaise(sub?.amount_paid) ||
    SINGLE_PLAN.amountPaise

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">
          Breathwork Community
        </p>

        <h1 className="mt-1 text-2xl font-bold text-foreground">
          Subscription
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Manage your Breathwork Community Membership and payment history.
        </p>
      </div>

      <CurrentPlanCard subscription={(sub as Subscription) ?? null} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Current membership
            </p>

            <h2 className="mt-1 text-xl font-semibold text-foreground">
              {SINGLE_PLAN.name}
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Monthly access to Dr Valar&apos;s Breathwork Community, recordings,
              and practice resources.
            </p>
          </div>

          <div className="rounded-xl bg-primary/10 px-4 py-3 text-left sm:text-right">
            <p className="text-xs font-medium text-muted-foreground">
              Membership price
            </p>

            <p className="mt-1 text-lg font-bold text-foreground">
              {formatINR(paidPaise)}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / month
              </span>
            </p>
          </div>
        </div>

        {isActive && sub?.expires_at && (
          <div className="mt-5 rounded-xl border border-border bg-background/50 p-4">
            <p className="text-sm font-medium text-foreground">
              {isCancelling ? "Active until" : "Next billing date"}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {fmtDate(sub.expires_at)}
            </p>
          </div>
        )}

        {isExpired && (
          <div className="mt-5 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
            <p className="text-sm font-medium text-yellow-600">
              Membership expired
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Renew your membership to continue accessing all community features.
            </p>
          </div>
        )}

        {isCancelling && (
          <div className="mt-5 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
            <p className="text-sm font-medium text-yellow-600">
              Subscription cancelling
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Your membership will remain active until {fmtDate(sub?.expires_at)}.
              You will not be charged again.
            </p>
          </div>
        )}

        {isRecurring && !isCancelling && !isExpired && (
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium text-foreground">
              Autopay active
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Your membership renews automatically every month.
            </p>
          </div>
        )}
      </div>

      {isExpired && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-3 text-sm text-muted-foreground">
            Your subscription has expired. Renew to continue accessing all
            features.
          </p>

          <RenewButton
            planId={SINGLE_PLAN.id}
            userEmail={user.email}
            userName={profile?.full_name ?? undefined}
          />
        </div>
      )}

      <PaymentHistory
        subscriptions={(subscriptions as Subscription[]) ?? []}
        invoices={(invoices as Invoice[]) ?? []}
      />

      {isRecurring &&
        !isCancelling &&
        !isExpired &&
        sub?.recurring_status === "active" && (
          <section className="mt-10 border-t border-border pt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Danger zone
            </h2>

            <div className="flex flex-col gap-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Cancel subscription
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Stops future renewals. You keep access until{" "}
                  {fmtDate(sub.expires_at)}.
                </p>
              </div>

              <CancelSubscriptionButton
                subscriptionId={sub.razorpay_subscription_id!}
              />
            </div>
          </section>
        )}
    </div>
  )
}