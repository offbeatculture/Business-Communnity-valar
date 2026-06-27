import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

type Props = {
  status: "active" | "expired" | "none"
  expiresAt: string | null
}

export function SubscriptionBadge({ status, expiresAt }: Props) {
  if (status === "none") {
    return (
      <Badge
        variant="outline"
        className="border-border text-muted-foreground"
      >
        No Membership
      </Badge>
    )
  }

  const isActive = status === "active"

  const dateLabel = expiresAt
    ? format(new Date(expiresAt), "dd MMM yyyy")
    : null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="outline"
        className={
          isActive
            ? "border-green-500/20 bg-green-500/10 text-green-600"
            : "border-primary/20 bg-primary/10 text-primary"
        }
      >
        {isActive ? "Active Member" : "Membership Expired"}
      </Badge>

      {dateLabel && (
        <span className="text-xs text-muted-foreground">
          {isActive ? `Valid until ${dateLabel}` : `Expired on ${dateLabel}`}
        </span>
      )}
    </div>
  )
}