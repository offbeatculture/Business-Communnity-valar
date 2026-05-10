import Link from "next/link"
import { Sparkles } from "lucide-react"
import type { ProductTier } from "@/lib/plans"

interface TierBannerProps {
  userTier: ProductTier | null
}

export function TierBanner({ userTier }: TierBannerProps) {
  // AI Lab members see no banner (full access)
  if (userTier === "ai_lab") return null

  let copy: string
  let cta: string

  if (!userTier || userTier === "library") {
    copy =
      "Upgrade to Workshop tier to attend live workshops, apply for hot seats, and unlock instant replays."
    cta = "See upgrade options"
  } else {
    // workshop tier
    copy =
      "AI Lab events are available on the AI Lab tier. Upgrade for live access and exclusive AI Lab replays."
    cta = "Explore AI Lab"
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start sm:items-center gap-3 text-sm flex-col sm:flex-row">
      <div className="flex items-center gap-2 flex-1">
        <Sparkles className="size-4 text-primary shrink-0" />
        <span className="text-foreground/90">{copy}</span>
      </div>
      <Link
        href="/subscription"
        className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
      >
        {cta} →
      </Link>
    </div>
  )
}
