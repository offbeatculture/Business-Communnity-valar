import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

type Props = {
  status: "active" | "expired" | "none"
  expiresAt: string | null
}

export function SubscriptionBadge({ status, expiresAt }: Props) {
  if (status === "none") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        No Subscription
      </Badge>
    )
  }

  const isActive = status === "active"
  const dateLabel = expiresAt
    ? format(new Date(expiresAt), "dd MMM yyyy")
    : null

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={
          isActive
            ? "bg-green-500/10 text-green-500 border-green-500/20"
            : "bg-primary/10 text-primary border-primary/20"
        }
      >
        {isActive ? "Active" : "Expired"}
      </Badge>
      {dateLabel && (
        <span className="text-xs text-muted-foreground">
          {isActive ? `Expires ${dateLabel}` : `Expired ${dateLabel}`}
        </span>
      )}
    </div>
  )
}
