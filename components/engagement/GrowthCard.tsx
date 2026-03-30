import { Card, CardContent } from "@/components/ui/card"
import { LevelBadge } from "./LevelBadge"
import { StreakIndicator } from "./StreakIndicator"
import { LevelsGuideDialog } from "./LevelsGuideDialog"
import { getNextLevel, getLevelInfo } from "@/lib/engagement-constants"
import type { MemberLevel } from "@/types"

type Props = {
  memberLevel: MemberLevel
}

function getMotivation(percent: number): string {
  if (percent >= 80) return "Almost there!"
  if (percent >= 50) return "Keep going!"
  return "Just getting started"
}

export function GrowthCard({ memberLevel }: Props) {
  const currentInfo = getLevelInfo(memberLevel.current_level)
  const nextLevel = getNextLevel(memberLevel.current_level)

  const progressPercent = nextLevel
    ? Math.min(
        100,
        ((memberLevel.total_gp - currentInfo.gp) / (nextLevel.gp - currentInfo.gp)) * 100
      )
    : 100

  return (
    <Card className="shadow-lg shadow-primary/5">
      <CardContent className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LevelBadge level={memberLevel.current_level} />
            <span className="text-sm text-muted-foreground">
              {memberLevel.total_gp} GP
            </span>
            <LevelsGuideDialog />
          </div>
          <StreakIndicator streak={memberLevel.current_streak} />
        </div>

        {/* Progress bar */}
        {nextLevel ? (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{currentInfo.name}</span>
              <span>{nextLevel.name} — {nextLevel.gp.toLocaleString()} GP</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">
                {(nextLevel.gp - memberLevel.total_gp).toLocaleString()} GP to {nextLevel.name}
              </p>
              <p className="text-xs text-primary/70 font-medium">
                {getMotivation(progressPercent)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Max level reached
          </p>
        )}
      </CardContent>
    </Card>
  )
}
