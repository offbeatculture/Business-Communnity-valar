import Link from "next/link"
import { Lock } from "lucide-react"
import type { ProductTier } from "@/lib/plans"
import { getTierRank } from "@/lib/plans"

// ============================================================
// AiLabUpsellCard
//
// Phase 6 polish. Renders below the events list to make it visible to
// Library and Workshop members that AI Lab events exist but are
// tier-locked. Without this nudge the RLS filter is invisible — the
// member only sees the events they qualify for and has no idea AI Lab
// content exists, which kills upgrade motivation.
//
// Renders nothing for AI Lab members (full access already) and nothing
// when there is no active tier (the top-of-page TierBanner already
// nudges those users with stronger copy).
// ============================================================

type Props = {
  userTier: ProductTier | null
}

export function AiLabUpsellCard({ userTier }: Props) {
  // AI Lab members already have access; nothing to upsell here.
  if (userTier === "ai_lab") return null

  // No active tier → the top-of-page TierBanner already handles upsell.
  // We avoid stacking two upgrade nudges on the same page for that case.
  if (!userTier) return null

  // Library and Workshop both need the AI Lab pitch.
  if (getTierRank(userTier) >= 3) return null

  return (
    <div className="mt-8 rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-4 flex items-start sm:items-center gap-3 text-sm flex-col sm:flex-row">
      <div className="flex items-center gap-2 flex-1">
        <Lock className="size-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground">
          AI Lab events are exclusive to AI Lab tier members.
        </span>
      </div>
      <Link
        href="/subscription"
        className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
      >
        Upgrade to AI Lab →
      </Link>
    </div>
  )
}
