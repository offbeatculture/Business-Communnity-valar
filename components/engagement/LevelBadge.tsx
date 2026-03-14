import { getLevelInfo } from "@/lib/engagement-constants"

type Props = {
  level: number
  size?: "sm" | "md"
}

const colorMap: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "red-gradient": "bg-gradient-to-r from-red-100 to-orange-100 text-red-700 dark:from-red-900/30 dark:to-orange-900/30 dark:text-red-400",
  "gold-gradient": "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 dark:from-yellow-900/30 dark:to-amber-900/30 dark:text-yellow-400",
}

export function LevelBadge({ level, size = "md" }: Props) {
  const info = getLevelInfo(level)
  const colorClass = colorMap[info.color] ?? colorMap.gray
  const sizeClass = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${colorClass}`}>
      {info.name}
    </span>
  )
}
