"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download } from "lucide-react"
import { formatINR } from "@/lib/plans"
import type { Subscription, Invoice } from "@/types"

type Props = {
  subscriptions: Subscription[]
  invoices: Invoice[]
}

export function PaymentHistory({ subscriptions, invoices }: Props) {
  if (subscriptions.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No payments yet.</p>
        </CardContent>
      </Card>
    )
  }

  const invoiceBySubId = new Map(
    invoices.map((inv) => [inv.subscription_id, inv])
  )

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile card layout */}
        <div className="sm:hidden space-y-3">
          {subscriptions.map((sub) => {
            const invoice = invoiceBySubId.get(sub.id)
            const planLabels: Record<string, string> = {
              monthly: "Monthly",
              annual: "Annual",
            }

            return (
              <div key={sub.id} className="rounded-lg border p-3 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(sub.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <Badge
                    variant="secondary"
                    className={
                      sub.status === "active"
                        ? "bg-green-500/10 text-green-500"
                        : sub.status === "expired"
                          ? "bg-muted text-muted-foreground"
                          : "bg-destructive/10 text-destructive"
                    }
                  >
                    {sub.status === "active" ? "Active" : sub.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{planLabels[sub.plan_name] ?? sub.plan_name}</span>
                  <span className="font-medium tabular-nums">{formatINR(sub.amount_paid)}</span>
                </div>
                {invoice && (
                  <a href={`/api/invoices/${invoice.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full mt-1">
                      <Download className="size-4 mr-2" />
                      Download Invoice
                    </Button>
                  </a>
                )}
              </div>
            )
          })}
        </div>

        {/* Desktop table layout */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-muted-foreground font-medium">Date</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Plan</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Amount</th>
                <th className="text-center py-2 text-muted-foreground font-medium">Status</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => {
                const invoice = invoiceBySubId.get(sub.id)
                const planLabels: Record<string, string> = {
                  monthly: "Monthly",
                  annual: "Annual",
                }

                return (
                  <tr key={sub.id} className="border-b last:border-0">
                    <td className="py-3 tabular-nums">
                      {new Date(sub.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3">{planLabels[sub.plan_name] ?? sub.plan_name}</td>
                    <td className="py-3 text-right tabular-nums">{formatINR(sub.amount_paid)}</td>
                    <td className="py-3 text-center">
                      <Badge
                        variant="secondary"
                        className={
                          sub.status === "active"
                            ? "bg-green-500/10 text-green-500"
                            : sub.status === "expired"
                              ? "bg-muted text-muted-foreground"
                              : "bg-destructive/10 text-destructive"
                        }
                      >
                        {sub.status === "active" ? "Active" : sub.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {invoice ? (
                        <a href={`/api/invoices/${invoice.id}/download`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon-xs">
                            <Download className="size-4" />
                          </Button>
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
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
