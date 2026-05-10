// ============================================================
// TierBadge — pill displaying the user's product tier
//
// Phase 3 of the three-tier subscription system. Pure presentational
// component — no data fetching. Pass `tier` from `useUserTier()` (client)
// or `getUserTier()` (server) at the call site.
//
// Visual hierarchy (per BRAND.md — warm-toned accents only, no indigo/violet):
//   Library  — muted neutral, signals the entry tier without ornament.
//   Workshop — accent-blue tone, the codebase's secondary accent.
//   AI Lab   — warm red-to-orange gradient, the brand's "key emphasis"
//              treatment, reserved for the most distinctive lock-in.
//
// Spec: Three-tier-implementation-plan.md, section 6.1 (UI layer) and
//       section 2 access matrix ("Tier badge on profile").
// ============================================================

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { type ProductTier, TIER_LABELS } from "@/lib/plans"

export type TierBadgeProps = {
  tier: ProductTier | null
  size?: "sm" | "md"
  className?: string
}

// Tailwind class strings per tier. Kept as a static map (rather than inlined
// conditionals) so each tier's full visual treatment is readable in one place.
const TIER_STYLES: Record<ProductTier, string> = {
  library: "bg-muted text-muted-foreground border-transparent",
  workshop:
    "bg-[#2979FF]/10 text-[#2979FF] border-[#2979FF]/20 dark:text-[#5C9BFF]",
  ai_lab:
    "bg-gradient-to-r from-[#E53935] to-[#FF6D00] text-white border-transparent shadow-sm",
}

const SIZE_STYLES: Record<NonNullable<TierBadgeProps["size"]>, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
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
      data-tier={tier}
      className={cn(
        "font-medium",
        TIER_STYLES[tier],
        SIZE_STYLES[size],
        className,
      )}
    >
      {TIER_LABELS[tier]}
    </Badge>
  )
}
