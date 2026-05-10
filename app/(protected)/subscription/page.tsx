import { redirect } from "next/navigation"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { CurrentPlanCard } from "@/components/subscription/CurrentPlanCard"
import { PaymentHistory } from "@/components/subscription/PaymentHistory"
import { RenewButton } from "@/components/subscription/RenewButton"
import { CancelSubscriptionButton } from "@/components/subscription/CancelSubscriptionButton"
import { TierChangeCards } from "@/components/subscription/TierChangeCards"
import {
  formatINR,
  getCurrentlySellingTiers,
  getTierLabel,
  TIER_LABELS,
  type ProductTier,
} from "@/lib/plans"
import type { Subscription, Invoice } from "@/types"

// Helper: format an ISO timestamp as "d MMM yyyy" for IST-only audience.
// Date-fns formats in server-local time; for India we ship in IST.
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ""
  return format(new Date(iso), "d MMM yyyy")
}

// Subscription row including the three-tier columns added in
// 20260510_three_tier_system.sql. The shared `Subscription` type in
// `types/index.ts` has not been updated yet (Phase 5A own that edit), so
// we extend it locally rather than triggering a cross-phase merge conflict.
type TierSubscriptionRow = Subscription & {
  tier?: ProductTier | null
  tier_rank?: number | null
  locked_price_paise?: number | null
  band_at_signup?: string | null
  pending_downgrade_to?: ProductTier | null
  pending_downgrade_effective_at?: string | null
}

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Profile (for prefill / display).
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single()

  // Latest subscription row. ORDER BY expires_at DESC matches the pattern
  // used elsewhere (middleware, lib/profile.ts) so the same row surfaces
  // across the app.
  const { data: latestSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // All subscriptions for the payment-history component.
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // Invoices.
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const sub = (latestSub as TierSubscriptionRow | null) ?? null

  const isExpired = !sub?.expires_at || new Date(sub.expires_at) < new Date()
  const isCancelling = sub?.recurring_status === "cancelled" && !isExpired
  const isRecurring = !!sub?.razorpay_subscription_id

  // Active subscription count drives band derivation. Best-effort — falls
  // back to 0 if the query fails so the page still renders.
  let activeCount = 0
  try {
    const { count } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())
    activeCount = count ?? 0
  } catch {
    activeCount = 0
  }
  const sellingTiers = getCurrentlySellingTiers(activeCount)

  // Determine whether this user has already used their one-tier-change-per
  // -billing-period allowance (D5). Skips the query entirely if there is no
  // active subscription to anchor the billing period to.
  let alreadyChangedThisPeriod = false
  if (sub?.starts_at && sub.status === "active") {
    const { count: changeCount } = await supabase
      .from("tier_changes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("requested_at", sub.starts_at)
    alreadyChangedThisPeriod = (changeCount ?? 0) > 0
  }

  // A user is "legacy one-time" if their active subscription has no
  // razorpay_subscription_id — they paid via the older one-shot order flow
  // and cannot use the recurring upgrade/downgrade plumbing.
  const isLegacy = !!sub && sub.status === "active" && !isRecurring

  // Tier-related display flags.
  const currentTier = (sub?.tier ?? null) as ProductTier | null
  const isFoundingBand = sub?.band_at_signup === "founding"
  const lockedPaise =
    typeof sub?.locked_price_paise === "number" && sub.locked_price_paise > 0
      ? sub.locked_price_paise
      : sub?.amount_paid ?? 0
  const pendingDowngradeTo = sub?.pending_downgrade_to ?? null
  const pendingDowngradeAt = sub?.pending_downgrade_effective_at ?? null

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Subscription</h1>

      {/* ── Section A: Current plan ── */}
      <CurrentPlanCard subscription={(sub as Subscription) ?? null} />

      {/* Tier-specific augmentation block. Sits under CurrentPlanCard so
          the existing card stays generic and we layer on tier metadata
          without forking the component. */}
      {sub && currentTier && (
        <div className="-mt-2 mb-6 space-y-3">
          <div className="rounded-lg border border-border bg-card/40 p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-lg font-semibold">
                {getTierLabel(currentTier)}
              </p>
              {isFoundingBand && (
                <span className="inline-flex items-center rounded-full bg-[#E53935]/10 px-2 py-0.5 text-xs font-medium text-[#E53935] border border-[#E53935]/30">
                  Founding member &mdash; price locked for life
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Locked at {formatINR(lockedPaise)}/month
              {sub.band_at_signup ? ` — ${sub.band_at_signup} band` : ""}
            </p>
            {!isExpired && sub.expires_at && (
              <p className="text-sm text-muted-foreground mt-1">
                Next billing date:{" "}
                <span className="tabular-nums">
                  {fmtDate(sub.expires_at)}
                </span>
              </p>
            )}
          </div>

          {pendingDowngradeTo && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-sm font-medium text-amber-500">
                Downgrade scheduled
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Your subscription will downgrade to{" "}
                {TIER_LABELS[pendingDowngradeTo]} on{" "}
                {fmtDate(pendingDowngradeAt)}. You will keep current access
                until then.
              </p>
            </div>
          )}

          {isLegacy && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium">
                Legacy one-time subscription
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Your subscription was set up under the older one-time-payment
                flow, so tier changes are unavailable through the app. Please
                contact support if you would like to switch tiers.
              </p>
            </div>
          )}
        </div>
      )}

      {isCancelling && (
        <div className="mt-4 mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-500 font-medium">
            Subscription cancelling
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Your subscription will remain active until {fmtDate(sub!.expires_at)}.
            You will not be charged again.
          </p>
        </div>
      )}

      {isRecurring && !isCancelling && !isExpired && sub?.recurring_status === "active" && (
        <div className="mt-4 mb-6 rounded-lg border border-[#333] bg-[#1a1a1a] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Autopay active</p>
              <p className="text-xs text-muted-foreground mt-1">
                Next billing: {fmtDate(sub.expires_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Section B: Change tier ── */}
      {sub && currentTier && !isExpired && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Change tier</h2>
          <TierChangeCards
            tiers={sellingTiers}
            currentTier={currentTier}
            currentLockedPaise={lockedPaise}
            startsAt={sub.starts_at}
            expiresAt={sub.expires_at}
            pendingDowngradeTo={pendingDowngradeTo}
            alreadyChangedThisPeriod={alreadyChangedThisPeriod}
            isLegacy={isLegacy}
          />
        </section>
      )}

      {/* ── Section C: Payment history ── */}
      <PaymentHistory
        subscriptions={(subscriptions as Subscription[]) ?? []}
        invoices={(invoices as Invoice[]) ?? []}
      />

      {isExpired && (
        <div className="mt-4 mb-6">
          <p className="text-muted-foreground text-sm mb-3">
            Your subscription has expired. Renew to continue accessing all features.
          </p>
          <RenewButton
            planId="monthly"
            userEmail={user.email}
            userName={profile?.full_name ?? undefined}
          />
        </div>
      )}

      {/* ── Section D: Danger zone ── */}
      {isRecurring && !isCancelling && !isExpired && sub?.recurring_status === "active" && (
        <section className="mt-10 pt-6 border-t border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Danger zone
          </h2>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Cancel subscription</p>
              <p className="text-xs text-muted-foreground mt-1">
                Stops future renewals. You keep access until {fmtDate(sub.expires_at)}.
              </p>
            </div>
            <CancelSubscriptionButton subscriptionId={sub.razorpay_subscription_id!} />
          </div>
        </section>
      )}
    </div>
  )
}
