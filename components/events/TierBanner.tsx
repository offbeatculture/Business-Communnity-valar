import Link from "next/link"
import { Sparkles } from "lucide-react"
import type { ProductTier } from "@/lib/plans"

interface TierBannerProps {
  userTier: ProductTier | null
}

export function TierBanner({ userTier }: TierBannerProps) {
  // Active members should not see upgrade banners.
  if (userTier) return null

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-2">
        <Sparkles className="size-4 shrink-0 text-primary" />

        <span className="text-foreground/90">
          Join the Lifinity Membership to access live sessions,
          recordings, and practice resources.
        </span>
      </div>

      <Link
        href="/plans"
        className="whitespace-nowrap text-sm font-medium text-primary hover:underline"
      >
        Join Membership →
      </Link>
    </div>
  )
}