import { AlertTriangle, CheckCircle2, CircleAlert, RefreshCcw, Users } from "lucide-react"
import { requireBillingAdmin } from "@/lib/billing/page-guard"
import { loadBillingData } from "@/lib/billing/data"
import { fmt } from "@/lib/billing/reconcile"
import { SyncButton } from "@/components/admin/billing/SyncButton"
import { ReconciliationTable } from "@/components/admin/billing/ReconciliationTable"
import { Callout, PageHeader, StatCard, StatGrid } from "@/components/admin/billing/ui"

export const dynamic = "force-dynamic"

export default async function BillingReconciliationPage() {
  await requireBillingAdmin()

  let data: Awaited<ReturnType<typeof loadBillingData>> | null = null
  let loadError: string | null = null
  try {
    data = await loadBillingData()
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err)
  }

  const sync = data?.syncState ?? null
  const rows = data?.rows ?? []
  const members = rows.filter((r) => r.member).length
  const active = rows.filter((r) => r.access === "active").length
  const fixNow = rows.filter((r) => r.topSeverity === "high").length
  const review = rows.filter((r) => r.topSeverity === "medium").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reconciliation"
        description="Each member's membership compared with what Razorpay says they paid. Where they disagree, you'll see why and can fix it in one click."
        actions={
          <SyncButton
            lastCompletedAt={sync?.lastCompletedAt ?? null}
            lastError={sync?.error ?? null}
            inProgress={!!sync && sync.phase !== "done" && !sync.error}
          />
        }
      />

      {loadError ? (
        <Callout tone="bad" icon={CircleAlert} title="Couldn't load billing data">
          <p>{loadError}</p>
          <p className="mt-1">
            If this mentions <code>rzp_</code> tables, run <code>20261110_billing_admin.sql</code> in the Supabase SQL
            editor first.
          </p>
        </Callout>
      ) : data && !sync?.lastCompletedAt ? (
        <Callout tone="warn" icon={RefreshCcw} title="Razorpay hasn't been synced yet">
          Press <strong>Sync now</strong>. The first sync reads every payment since 1 June and takes a few minutes. After
          that it only fetches what&apos;s new.
        </Callout>
      ) : null}

      {data && (
        <>
          <StatGrid>
            <StatCard icon={Users} label="Members" value={members} hint={`${active} with access today`} />
            <StatCard
              icon={CircleAlert}
              label="Fix now"
              value={fixNow}
              tone={fixNow ? "bad" : "good"}
              hint={fixNow ? "Paid but blocked, or access without paying" : "Nothing urgent"}
            />
            <StatCard
              icon={AlertTriangle}
              label="Worth a review"
              value={review}
              tone={review ? "warn" : "good"}
              hint="Wrong amounts, staff, ended plans"
            />
            <StatCard
              icon={CheckCircle2}
              label="Razorpay data"
              value={sync?.lastCompletedAt ? fmt(sync.lastCompletedAt) : "Never"}
              tone={sync?.lastCompletedAt ? "good" : "warn"}
              hint={`${data.counts.payments.toLocaleString("en-IN")} payments · ${data.counts.rzpSubs.toLocaleString("en-IN")} subscriptions`}
            />
          </StatGrid>

          <ReconciliationTable rows={rows} />
        </>
      )}
    </div>
  )
}
