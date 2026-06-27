import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SINGLE_PLAN, formatINR } from "@/lib/plans"
import type { Subscription } from "@/types"

type SubscriptionRow = Subscription & {
  plan_id?: string | null
  plan_name?: string | null
  plan_label?: string | null
  amount_paid?: number | string | null
  amount_paise?: number | string | null
  locked_price_paise?: number | string | null
  expires_at?: string | null
  recurring_status?: string | null
  razorpay_subscription_id?: string | null
}

function toPaise(value: number | string | null | undefined): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseInt(value, 10) || 0
  return 0
}

export function CurrentPlanCard({
  subscription,
}: {
  subscription: Subscription | null
}) {
  if (!subscription) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Membership</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active membership found.
          </p>
        </CardContent>
      </Card>
    )
  }

  const sub = subscription as SubscriptionRow

  const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null
  const now = new Date()

  const daysRemaining = expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0

  const isExpired = !expiresAt || daysRemaining === 0
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7
  const isCancelling = sub.recurring_status === "cancelled" && !isExpired
  const isRecurring = !!sub.razorpay_subscription_id

  const amountPaise =
    toPaise(sub.locked_price_paise) ||
    toPaise(sub.amount_paise) ||
    toPaise(sub.amount_paid) ||
    SINGLE_PLAN.amountPaise

  return (
    <Card className={`mb-6 ${!isExpired ? "border-primary/30" : ""}`}>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Current Membership</CardTitle>

          <p className="mt-1 text-sm text-muted-foreground">
            {SINGLE_PLAN.name}
          </p>
        </div>

        <Badge
          variant={isExpired ? "destructive" : "secondary"}
          className={
            !isExpired && !isExpiringSoon
              ? "border-green-500/20 bg-green-500/10 text-green-600"
              : isExpiringSoon
                ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                : ""
          }
        >
          {isExpired
            ? "Expired"
            : isCancelling
              ? "Cancelling"
              : isExpiringSoon
                ? "Expiring Soon"
                : "Active"}
        </Badge>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 sm:gap-4">
          <div>
            <p className="mb-1 text-muted-foreground">Amount</p>
            <p className="font-medium tabular-nums">
              {formatINR(amountPaise)}
              <span className="text-muted-foreground"> / month</span>
            </p>
          </div>

          <div>
            <p className="mb-1 text-muted-foreground">
              {isRecurring && !isCancelling ? "Next Billing" : "Valid Until"}
            </p>

            <p className="font-medium tabular-nums">
              {expiresAt
                ? expiresAt.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>

          <div>
            <p className="mb-1 text-muted-foreground">Days Left</p>

            <p
              className={`font-medium tabular-nums ${
                isExpired
                  ? "text-destructive"
                  : isExpiringSoon
                    ? "text-amber-600"
                    : ""
              }`}
            >
              {isExpired ? "0" : daysRemaining}
            </p>
          </div>
        </div>

        {isRecurring && !isExpired && (
          <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
            Autopay is active. Your membership renews automatically every month.
          </p>
        )}

        {isCancelling && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-muted-foreground">
            Your membership will stay active until the current billing period
            ends. You will not be charged again.
          </p>
        )}
      </CardContent>
    </Card>
  )
}