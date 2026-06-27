import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { SINGLE_PLAN, type ProductTier } from "@/lib/plans"

export type TierBadgeProps = {
  tier: ProductTier | null
  size?: "sm" | "md"
  className?: string
}

const SIZE_STYLES: Record<NonNullable<TierBadgeProps["size"]>, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
}

export function TierBadge({
  tier,
  size = "md",
  className,
}: TierBadgeProps): React.JSX.Element | null {
  if (!tier) return null

  return (
    <Badge
      variant="outline"
      data-tier="membership"
      className={cn(
        "border-primary/20 bg-primary/10 font-medium text-primary",
        SIZE_STYLES[size],
        className
      )}
    >
      {SINGLE_PLAN.name}
    </Badge>
  )
}