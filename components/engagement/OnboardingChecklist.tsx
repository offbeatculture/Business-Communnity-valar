import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Circle, Sprout } from "lucide-react"
import { LevelsGuideDialog } from "./LevelsGuideDialog"
import type { MemberLevel } from "@/types"

type Props = {
  firstName: string
  memberLevel: MemberLevel
  hasProfileSetup: boolean
  hasIntroPost: boolean
  hasCompletedAssessment: boolean
  hasCommentedOnOthers: boolean
}

const steps = [
  {
    key: "profile",
    label: "Complete your profile",
    gp: 15,
    href: "/profile/edit",
  },
  {
    key: "intro",
    label: "Introduce yourself",
    gp: 15,
    href: "/community?compose=introduction",
  },
  {
    key: "assessment",
    label: "Take the Business Assessment",
    gp: 20,
    href: "/assessment/scale-code",
  },
  {
    key: "comment",
    label: "Comment on a post",
    gp: 8,
    href: "/community",
  },
] as const

export function OnboardingChecklist({
  firstName,
  memberLevel,
  hasProfileSetup,
  hasIntroPost,
  hasCompletedAssessment,
  hasCommentedOnOthers,
}: Props) {
  const doneMap: Record<string, boolean> = {
    profile: hasProfileSetup,
    intro: hasIntroPost,
    assessment: hasCompletedAssessment,
    comment: hasCommentedOnOthers,
  }

  const completedCount = steps.filter((s) => doneMap[s.key]).length
  const remaining = steps.length - completedCount
  const totalGP = steps.reduce((sum, s) => sum + s.gp, 0)

  return (
    <Card className="border-primary/20 bg-primary/[0.03] shadow-lg shadow-primary/5">
      <CardContent className="px-4 py-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Sprout className="size-4 text-primary" />
          <p className="text-sm font-medium">
            Welcome, {firstName}! Every founder starts as a Seed.
          </p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {remaining > 0
            ? `Complete ${remaining} step${remaining !== 1 ? "s" : ""} to earn ${totalGP} GP and reach Sprout:`
            : "You did it! All steps complete."}
        </p>

        <div className="space-y-1">
          {steps.map((step) => {
            const done = doneMap[step.key]
            const content = (
              <div
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 transition-colors ${
                  done ? "" : "hover:bg-muted/50 cursor-pointer"
                }`}
              >
                {done ? (
                  <Check className="size-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="size-4 text-muted-foreground shrink-0" />
                )}
                <span
                  className={`text-sm ${done ? "text-muted-foreground line-through" : ""}`}
                >
                  {step.label}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  +{step.gp} GP
                </span>
              </div>
            )

            if (done) return <div key={step.key}>{content}</div>

            return (
              <Link key={step.key} href={step.href}>
                {content}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs font-medium">{memberLevel.total_gp} GP</span>
          <LevelsGuideDialog />
          <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (memberLevel.total_gp / 100) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">100 GP</span>
        </div>
      </CardContent>
    </Card>
  )
}
