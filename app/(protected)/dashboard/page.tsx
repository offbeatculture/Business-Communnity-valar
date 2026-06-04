import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { fetchProfile, fetchProfileStats } from "@/lib/profile"
import {
  fetchPosts,
  fetchUserInteractions,
  hasIntroPost,
  hasCommentedOnOthersPost,
} from "@/lib/community"
import { hasCompletedAssessment, SCALE_CODE_SLUG } from "@/lib/assessment"
import {
  fetchMemberLevel,
  fetchTodayPrompt,
  fetchPromptResponseCount,
  hasUserRespondedToPrompt,
  fetchWeeklyHighlights,
} from "@/lib/engagement"
import { PostCard } from "@/components/community/PostCard"
import { DailyPromptCard } from "@/components/engagement/DailyPromptCard"
import { CommunityHighlights } from "@/components/engagement/CommunityHighlights"
import { OnboardingChecklist } from "@/components/engagement/OnboardingChecklist"
import { LevelBadge } from "@/components/engagement/LevelBadge"
import { StreakIndicator } from "@/components/engagement/StreakIndicator"
import { LevelsGuideDialog } from "@/components/engagement/LevelsGuideDialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getNextLevel, getLevelInfo } from "@/lib/engagement-constants"
import {
  BookOpen,
  Users,
  ArrowRight,
  Sparkles,
  HandMetal,
  MessageSquare,
} from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [
    profile,
    stats,
    memberLevel,
    todayPrompt,
    highlights,
    { posts },
    userHasIntroPost,
    userCompletedAssessment,
    userCommentedOnOthers,
  ] = await Promise.all([
    fetchProfile(user.id),
    fetchProfileStats(user.id),
    fetchMemberLevel(user.id),
    fetchTodayPrompt(),
    fetchWeeklyHighlights(),
    fetchPosts({ page: 1, perPage: 3 }),
    hasIntroPost(user.id),
    hasCompletedAssessment(user.id, SCALE_CODE_SLUG),
    hasCommentedOnOthersPost(user.id),
  ])

  if (!profile) redirect("/login")

  const userRole = profile.role ?? "member"

  let promptResponseCount = 0
  let userRespondedToPrompt = false

  if (todayPrompt) {
    ;[promptResponseCount, userRespondedToPrompt] = await Promise.all([
      fetchPromptResponseCount(todayPrompt.id),
      hasUserRespondedToPrompt(user.id, todayPrompt.id),
    ])
  }

  const postIds = posts.map((p) => p.id)
  const { likedIds, savedIds } = await fetchUserInteractions(user.id, postIds)

  const firstName = profile.full_name?.split(" ")[0] ?? "there"
  const hasProfileSetup = !!(profile.business_name && profile.city)

  const allOnboardingDone =
    hasProfileSetup &&
    userHasIntroPost &&
    userCompletedAssessment &&
    userCommentedOnOthers

  const showOnboarding =
    memberLevel && (memberLevel.current_level ?? 1) === 1 && !allOnboardingDone

  const currentInfo = memberLevel ? getLevelInfo(memberLevel.current_level) : null
  const nextLevel = memberLevel ? getNextLevel(memberLevel.current_level) : null

  const progressPercent =
    memberLevel && currentInfo && nextLevel
      ? Math.min(
          100,
          ((memberLevel.total_gp - currentInfo.gp) /
            (nextLevel.gp - currentInfo.gp)) *
            100
        )
      : memberLevel && !nextLevel
        ? 100
        : 0

  const gpToGo =
    memberLevel && nextLevel
      ? Math.max(0, nextLevel.gp - memberLevel.total_gp)
      : 0

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-24 sm:space-y-6 sm:pb-10">
      {/* Hero */}
      <Card className="border-primary/10 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-lg shadow-primary/5 overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    const h = new Date().getHours()
                    return h < 12
                      ? "Good morning"
                      : h < 17
                        ? "Good afternoon"
                        : "Good evening"
                  })()}
                </p>

                <h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">
                  Welcome back, {firstName}!
                </h1>
              </div>

              {memberLevel && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <LevelBadge level={memberLevel.current_level} />
                  <span className="text-sm text-muted-foreground">
                    {memberLevel.total_gp} GP
                  </span>
                  <LevelsGuideDialog />
                  <StreakIndicator streak={memberLevel.current_streak} />
                </div>
              )}
            </div>

            {memberLevel && nextLevel && (
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-3 lg:min-w-56">
                <div className="relative size-14 shrink-0 sm:size-16">
                  <svg className="size-14 -rotate-90 sm:size-16" viewBox="0 0 64 64">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-secondary"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      strokeWidth="4"
                      className="text-primary"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 28 * (1 - progressPercent / 100)
                      }`}
                    />
                  </svg>

                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold sm:text-sm">
                    {Math.round(progressPercent)}%
                  </span>
                </div>

                <div className="text-sm">
                  <p className="font-medium">{nextLevel.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {gpToGo.toLocaleString()} GP to go
                  </p>
                </div>
              </div>
            )}
          </div>

          {memberLevel && nextLevel && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/50 pt-4 sm:mt-5 sm:gap-4 sm:pt-5">
            <StatItem label="Posts" value={stats.postCount} />
            <StatItem label="Comments" value={stats.commentCount} />
            <StatItem label="Likes" value={stats.likesReceived} />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Start here</h2>
          <Link
            href="/community"
            className="text-sm text-primary hover:underline"
          >
            Go to community
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickAction
            href="/content"
            icon={<BookOpen className="size-4 text-primary" />}
            title="Cheat Sheets"
            description="Browse resources"
          />

          <QuickAction
            href="/prompts"
            icon={<Sparkles className="size-4 text-primary" />}
            title="Prompts"
            description="Copy & implement"
          />

          <QuickAction
            href="/community?compose=introduction"
            icon={<HandMetal className="size-4 text-primary" />}
            title="Introduce"
            description="Say hi"
          />

          <QuickAction
            href="/community"
            icon={<Users className="size-4 text-primary" />}
            title="Members"
            description="Connect"
          />
        </div>
      </div>

      {/* Onboarding */}
      {showOnboarding && (
        <OnboardingChecklist
          firstName={firstName}
          memberLevel={memberLevel}
          hasProfileSetup={hasProfileSetup}
          hasIntroPost={userHasIntroPost}
          hasCompletedAssessment={userCompletedAssessment}
          hasCommentedOnOthers={userCommentedOnOthers}
        />
      )}

      {/* Daily Prompt */}
      {todayPrompt && (
        <DailyPromptCard
          prompt={todayPrompt}
          responseCount={promptResponseCount}
          hasResponded={userRespondedToPrompt}
        />
      )}

      {/* Posts + Highlights */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="border-l-2 border-primary pl-3 text-base font-semibold">
                Recent Community Posts
              </h2>
              <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
                See what members are asking, sharing, and building.
              </p>
            </div>

            <Link href="/community">
              <Button
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                View All <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
          </div>

  {posts.length > 0 ? (
  <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
    <div className="flex snap-x snap-mandatory gap-3 sm:block sm:space-y-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="w-[320px] shrink-0 snap-start sm:w-full"
        >
          <PostCard
            post={post}
            currentUserId={user.id}
            userRole={userRole}
            isLiked={likedIds.has(post.id)}
            isSaved={savedIds.has(post.id)}
          />
        </div>
      ))}
    </div>
  </div>
) : (
            <Card className="border-border/60">
              <CardContent className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <MessageSquare className="mb-3 size-8 text-muted-foreground" />
                <h3 className="font-semibold">No posts yet</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Be the first to introduce yourself or ask a question.
                </p>
                <Link href="/community?compose=introduction" className="mt-4">
                  <Button>Introduce Yourself</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <CommunityHighlights highlights={highlights} />
        </aside>
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-background/30 px-2 py-3 text-center sm:bg-transparent sm:py-0">
      <p className="text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
      <p className="text-[11px] text-muted-foreground sm:text-xs">{label}</p>
    </div>
  )
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full border-border/50 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 active:bg-accent/50">
        <CardContent className="flex h-full items-center gap-3 px-3 py-3 sm:px-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            {icon}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}