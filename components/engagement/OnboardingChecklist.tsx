import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Circle, Sprout } from "lucide-react"
import { LevelsGuideDialog } from "./LevelsGuideDialog"
import type { MemberLevel, ProfileStats } from "@/types"

type Props = {
  firstName: string
  memberLevel: MemberLevel
  stats: ProfileStats
  hasRespondedToPrompt: boolean
  hasProfileSetup: boolean
}

const stepLinks: Record<string, string> = {
  "Set up your profile": "/profile/edit",
  "Share your first post": "/community",
  "Respond to today's prompt": "#daily-prompt",
}

export function OnboardingChecklist({
  firstName,
  memberLevel,
  stats,
  hasRespondedToPrompt,
  hasProfileSetup,
}: Props) {
  const steps = [
    {
      label: "Set up your profile",
      done: hasProfileSetup,
      gp: 15,
    },
    {
      label: "Share your first post",
      done: stats.postCount > 0,
      gp: 15,
    },
    {
      label: "Respond to today's prompt",
      done: hasRespondedToPrompt,
      gp: 12,
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const totalGP = steps.reduce((sum, s) => sum + s.gp, 0)

  return (
    <Card className="border-red-500/20 bg-red-500/[0.03] shadow-lg shadow-red-500/5">
      <CardContent className="px-4 py-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Sprout className="size-4 text-red-500" />
          <p className="text-sm font-medium">
            Welcome, {firstName}! Every founder starts as a Seed.
          </p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Complete {3 - completedCount} step{3 - completedCount !== 1 ? "s" : ""} to reach Sprout:
        </p>

        <div className="space-y-1">
          {steps.map((step) => {
            const content = (
              <div
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 transition-colors ${
                  step.done ? "" : "hover:bg-muted/50 cursor-pointer"
                }`}
              >
                {step.done ? (
                  <Check className="size-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="size-4 text-muted-foreground shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    step.done ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  +{step.gp} GP
                </span>
              </div>
            )

            if (step.done) return <div key={step.label}>{content}</div>

            return (
              <Link key={step.label} href={stepLinks[step.label] ?? "#"}>
                {content}
              </Link>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          {totalGP} GP to Sprout — you can reach it today!
        </p>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs font-medium">{memberLevel.total_gp} GP</span>
          <LevelsGuideDialog />
          <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (memberLevel.total_gp / 100) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">100 GP</span>
        </div>
      </CardContent>
    </Card>
  )
}
