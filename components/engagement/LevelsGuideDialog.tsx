"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"
import { GP_VALUES, LEVEL_THRESHOLDS } from "@/lib/engagement-constants"

const GP_ACTIONS = [
  { action: "Share a post", gp: GP_VALUES.post },
  { action: "Respond to daily prompt", gp: GP_VALUES.prompt_response },
  { action: "Substantive comment (50+ chars)", gp: GP_VALUES.comment_substantive },
  { action: "Short comment", gp: GP_VALUES.comment_short },
  { action: "Receive a like", gp: GP_VALUES.like_received },
  { action: "Receive a comment", gp: GP_VALUES.comment_received },
  { action: "Like a post", gp: GP_VALUES.like_given },
  { action: "Daily visit", gp: GP_VALUES.daily_visit },
  { action: "View content", gp: GP_VALUES.content_view },
]

const LEVEL_REWARDS = [
  "Starting level",
  "Green badge, business tagline",
  "Veteran status, custom banner color",
  "Trusted Contributor, Founder AMA",
  // "Pin own posts, 1:1 calls",
  "Community Elder, early access",
  "Pathfinders Wall, founder dinner",
]

const STREAK_MILESTONES = [
  { days: 7, bonus: 10 },
  { days: 30, bonus: 50 },
  { days: 90, bonus: 150 },
  { days: 365, bonus: 500 },
]

export function LevelsGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Growth levels guide</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Growth Levels Guide</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          {/* Section 1: How to Earn GP */}
          <section>
            <h3 className="font-semibold mb-2">How to Earn Growth Points</h3>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                    <th className="px-3 py-2 text-right font-medium">GP</th>
                  </tr>
                </thead>
                <tbody>
                  {GP_ACTIONS.map(({ action, gp }) => (
                    <tr key={action} className="border-b last:border-0">
                      <td className="px-3 py-1.5">{action}</td>
                      <td className="px-3 py-1.5 text-right font-mono">+{gp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2: Levels */}
          <section>
            <h3 className="font-semibold mb-2">Levels</h3>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Level</th>
                    <th className="px-3 py-2 text-right font-medium">GP Required</th>
                    <th className="px-3 py-2 text-left font-medium">Unlocks</th>
                  </tr>
                </thead>
                <tbody>
                  {LEVEL_THRESHOLDS.map((level, i) => (
                    <tr key={level.level} className="border-b last:border-0">
                      <td className="px-3 py-1.5 font-medium">{level.name}</td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        {level.gp.toLocaleString()}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {LEVEL_REWARDS[i]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Streaks */}
          <section>
            <h3 className="font-semibold mb-2">Streaks</h3>
            <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
              <li>Visit daily to build your streak</li>
              <li>Miss 1 day? Grace period saves it (once per week)</li>
              <li>
                Bonus GP at milestones:{" "}
                {STREAK_MILESTONES.map(
                  (m, i) =>
                    `${m.days}-day (+${m.bonus})${i < STREAK_MILESTONES.length - 1 ? ", " : ""}`
                )}
              </li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
