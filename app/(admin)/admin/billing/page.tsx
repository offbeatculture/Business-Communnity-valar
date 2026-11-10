import { requireBillingAdmin } from "@/lib/billing/page-guard"
import { loadBillingData } from "@/lib/billing/data"
import { SyncButton } from "@/components/admin/billing/SyncButton"
import { ReconciliationTable } from "@/components/admin/billing/ReconciliationTable"

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Billing</p>
          <h1 className="mt-1 text-2xl font-bold">Reconciliation</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every member&apos;s membership next to what Razorpay says they paid. Where the two disagree you&apos;ll
            see why, and a fix you can apply in one click.
          </p>
        </div>
        <SyncButton
          lastCompletedAt={sync?.lastCompletedAt ?? null}
          lastError={sync?.error ?? null}
          inProgress={!!sync && sync.phase !== "done" && !sync.error}
        />
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Couldn&apos;t load billing data.</p>
          <p className="mt-1 text-muted-foreground">{loadError}</p>
          <p className="mt-2 text-muted-foreground">
            If this mentions <code>rzp_</code> tables, the migration <code>20261110_billing_admin.sql</code> hasn&apos;t
            been run yet.
          </p>
        </div>
      ) : data && !sync?.lastCompletedAt ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium">Razorpay hasn&apos;t been synced yet.</p>
          <p className="mt-1 text-muted-foreground">
            Press <strong>Sync now</strong>. The first sync reads every payment since 1 June and takes a few minutes;
            after that it only fetches what&apos;s new. Until then, Razorpay columns will be empty.
          </p>
        </div>
      ) : null}

      {data && <ReconciliationTable rows={data.rows} />}
    </div>
  )
}
