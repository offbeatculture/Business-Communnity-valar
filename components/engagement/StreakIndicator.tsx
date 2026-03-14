import { Flame } from "lucide-react"
import { getStreakColor } from "@/lib/engagement-constants"

type Props = {
  streak: number
  size?: "sm" | "md"
}

const colorMap: Record<string, string> = {
  gray: "text-muted-foreground",
  orange: "text-orange-500",
  red: "text-red-500",
  purple: "text-purple-500",
  gold: "text-yellow-500",
}

export function StreakIndicator({ streak, size = "md" }: Props) {
  const color = getStreakColor(streak)
  const colorClass = colorMap[color] ?? "text-muted-foreground"
  const iconSize = size === "sm" ? "size-3.5" : "size-4"
  const textSize = size === "sm" ? "text-xs" : "text-sm"

  return (
    <span className={`inline-flex items-center gap-1 ${colorClass}`}>
      <Flame className={iconSize} />
      <span className={`font-medium ${textSize}`}>{streak}</span>
    </span>
  )
}
