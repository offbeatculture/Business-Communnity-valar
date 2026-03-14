import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatINR } from "@/lib/plans"
import type { Subscription } from "@/types"

export function CurrentPlanCard({ subscription }: { subscription: Subscription | null }) {
  if (!subscription) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No active subscription.</p>
        </CardContent>
      </Card>
    )
  }

  const expiresAt = new Date(subscription.expires_at)
  const now = new Date()
  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  )
  const isExpired = daysRemaining === 0
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7

  const planLabels: Record<string, string> = {
    monthly: "Monthly",
    annual: "Annual",
  }

  return (
    <Card className={`mb-6 ${!isExpired ? "border-primary/30" : ""}`}>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Current Plan</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            {planLabels[subscription.plan_name] ?? subscription.plan_name}
          </p>
        </div>
        <Badge
          variant={isExpired ? "destructive" : "secondary"}
          className={
            !isExpired && !isExpiringSoon
              ? "bg-green-500/10 text-green-500 border-green-500/20"
              : isExpiringSoon
                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                : ""
          }
        >
          {isExpired ? "Expired" : isExpiringSoon ? "Expiring Soon" : "Active"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Amount</p>
            <p className="font-medium tabular-nums">{formatINR(subscription.amount_paid)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Expires</p>
            <p className="font-medium tabular-nums">
              {expiresAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Days Left</p>
            <p className={`font-medium tabular-nums ${isExpired ? "text-destructive" : isExpiringSoon ? "text-amber-500" : ""}`}>
              {isExpired ? "0" : daysRemaining}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
