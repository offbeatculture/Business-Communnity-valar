import { BillingTabs } from "@/components/admin/billing/BillingTabs"

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Billing</p>
        <div className="mt-3">
          <BillingTabs />
        </div>
      </div>
      {children}
    </div>
  )
}
