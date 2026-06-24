"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download } from "lucide-react"
import { SINGLE_PLAN, formatINR } from "@/lib/plans"
import type { Subscription, Invoice } from "@/types"

type Props = {
  subscriptions: Subscription[]
  invoices: Invoice[]
}

type SubscriptionRow = Subscription & {
  id: string
  created_at: string
  status?: string | null
  plan_id?: string | null
  plan_name?: string | null
  plan_label?: string | null
  amount_paid?: number | string | null
  amount_paise?: number | string | null
  locked_price_paise?: number | string | null
}

type InvoiceRow = Invoice & {
  subscription_id?: string | null
}

function toPaise(value: number | string | null | undefined): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseInt(value, 10) || 0
  return 0
}

function getAmount(sub: SubscriptionRow) {
  return (
    toPaise(sub.amount_paise) ||
    toPaise(sub.amount_paid) ||
    toPaise(sub.locked_price_paise) ||
    SINGLE_PLAN.amountPaise
  )
}

function getStatusLabel(status?: string | null) {
  if (status === "active") return "Active"
  if (status === "expired") return "Expired"
  if (status === "cancelled") return "Cancelled"
  return status || "Paid"
}

function getStatusClass(status?: string | null) {
  if (status === "active") {
    return "bg-green-500/10 text-green-600 border-green-500/20"
  }

  if (status === "expired") {
    return "bg-muted text-muted-foreground border-border"
  }

  if (status === "cancelled") {
    return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
  }

  return "bg-primary/10 text-primary border-primary/20"
}

export function PaymentHistory({ subscriptions, invoices }: Props) {
  if (subscriptions.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        </CardContent>
      </Card>
    )
  }

  const invoiceBySubId = new Map(
    (invoices as InvoiceRow[]).map((invoice) => [
      invoice.subscription_id,
      invoice,
    ])
  )

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 sm:hidden">
          {(subscriptions as SubscriptionRow[]).map((sub) => {
            const invoice = invoiceBySubId.get(sub.id)
            const amount = getAmount(sub)

            return (
              <div
                key={sub.id}
                className="space-y-3 rounded-xl border border-border bg-background/40 p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(sub.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>

                  <Badge
                    variant="secondary"
                    className={getStatusClass(sub.status)}
                  >
                    {getStatusLabel(sub.status)}
                  </Badge>
                </div>

                <div>
                  <p className="font-medium text-foreground">
                    {SINGLE_PLAN.name}
                  </p>

                  <p className="mt-1 text-muted-foreground">
                    {formatINR(amount)}
                  </p>
                </div>

                {invoice ? (
                  <a
                    href={`/api/invoices/${invoice.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="mr-2 size-4" />
                      Download Invoice
                    </Button>
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Invoice not generated yet.
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-left font-medium text-muted-foreground">
                  Date
                </th>

                <th className="py-2 text-left font-medium text-muted-foreground">
                  Membership
                </th>

                <th className="py-2 text-right font-medium text-muted-foreground">
                  Amount
                </th>

                <th className="py-2 text-center font-medium text-muted-foreground">
                  Status
                </th>

                <th className="py-2 text-right font-medium text-muted-foreground">
                  Invoice
                </th>
              </tr>
            </thead>

            <tbody>
              {(subscriptions as SubscriptionRow[]).map((sub) => {
                const invoice = invoiceBySubId.get(sub.id)
                const amount = getAmount(sub)

                return (
                  <tr key={sub.id} className="border-b border-border last:border-0">
                    <td className="py-3 tabular-nums">
                      {new Date(sub.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3">{SINGLE_PLAN.name}</td>

                    <td className="py-3 text-right tabular-nums">
                      {formatINR(amount)}
                    </td>

                    <td className="py-3 text-center">
                      <Badge
                        variant="secondary"
                        className={getStatusClass(sub.status)}
                      >
                        {getStatusLabel(sub.status)}
                      </Badge>
                    </td>

                    <td className="py-3 text-right">
                      {invoice ? (
                        <a
                          href={`/api/invoices/${invoice.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <Download className="size-4" />
                          </Button>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}