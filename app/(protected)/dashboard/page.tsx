import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { fetchProfile, fetchProfileStats } from "@/lib/profile"
import { fetchPosts, fetchUserInteractions, hasIntroPost, hasCommentedOnOthersPost } from "@/lib/community"
import { hasCompletedAssessment, SCALE_CODE_SLUG } from "@/lib/assessment"
import { fetchMemberLevel, fetchTodayPrompt, fetchPromptResponseCount, hasUserRespondedToPrompt, fetchWeeklyHighlights } from "@/lib/engagement"
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
import { BookOpen, Users, ArrowRight, Sparkles, HandMetal } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [profile, stats, memberLevel, todayPrompt, highlights, { posts }, userHasIntroPost, userCompletedAssessment, userCommentedOnOthers] = await Promise.all([
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

  // Fetch prompt-related data if prompt exists
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

  const allOnboardingDone = hasProfileSetup && userHasIntroPost && userCompletedAssessment && userCommentedOnOthers
  const showOnboarding = memberLevel && (memberLevel.current_level ?? 1) === 1 && !allOnboardingDone

  // Progress toward next level
  const currentInfo = memberLevel ? getLevelInfo(memberLevel.current_level) : null
  const nextLevel = memberLevel ? getNextLevel(memberLevel.current_level) : null
  const progressPercent = memberLevel && currentInfo && nextLevel
    ? Math.min(100, ((memberLevel.total_gp - currentInfo.gp) / (nextLevel.gp - currentInfo.gp)) * 100)
    : memberLevel && !nextLevel ? 100 : 0

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Hero Welcome Card */}
      <Card className="mb-6 border-primary/10 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-lg shadow-primary/5 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Welcome + Stats */}
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening" })()}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Welcome back, {firstName}!
                </h1>
              </div>
              {memberLevel && (
                <div className="flex items-center gap-3">
                  <LevelBadge level={memberLevel.current_level} />
                  <span className="text-sm text-muted-foreground">{memberLevel.total_gp} GP</span>
                  <LevelsGuideDialog />
                  <StreakIndicator streak={memberLevel.current_streak} />
                </div>
              )}
            </div>

            {/* Right: Progress ring */}
            {memberLevel && nextLevel && (
              <div className="flex items-center gap-3">
                <div className="relative size-16 shrink-0">
                  <svg className="size-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-secondary" />
                    <circle
                      cx="32" cy="32" r="28" fill="none" strokeWidth="4"
                      className="text-primary"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercent / 100)}`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                    {Math.round(progressPercent)}%
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium">{nextLevel.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(nextLevel.gp - memberLevel.total_gp).toLocaleString()} GP to go
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {memberLevel && nextLevel && (
            <div className="mt-4">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Inline stats */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border/50">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{stats.postCount}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{stats.commentCount}</p>
              <p className="text-xs text-muted-foreground">Comments</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{stats.likesReceived}</p>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Checklist — shows until all steps complete */}
      {showOnboarding && (
        <div className="mb-6">
          <OnboardingChecklist
            firstName={firstName}
            memberLevel={memberLevel}
            hasProfileSetup={hasProfileSetup}
            hasIntroPost={userHasIntroPost}
            hasCompletedAssessment={userCompletedAssessment}
            hasCommentedOnOthers={userCommentedOnOthers}
          />
        </div>
      )}

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link href="/content" className="group">
          <Card className="h-full border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 active:bg-accent/50">
            <CardContent className="px-4 py-3 flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Cheat Sheets</p>
                <p className="text-xs text-muted-foreground">Browse resources</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/prompts" className="group">
          <Card className="h-full border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 active:bg-accent/50">
            <CardContent className="px-4 py-3 flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Prompts</p>
                <p className="text-xs text-muted-foreground">Copy & implement</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/community?compose=introduction" className="group">
          <Card className="h-full border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 active:bg-accent/50">
            <CardContent className="px-4 py-3 flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <HandMetal className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Introduce Yourself</p>
                <p className="text-xs text-muted-foreground">Say hi</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/community" className="group">
          <Card className="h-full border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 active:bg-accent/50">
            <CardContent className="px-4 py-3 flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Members</p>
                <p className="text-xs text-muted-foreground">Connect with founders</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Daily Prompt Card */}
      {todayPrompt && (
        <div className="mb-6">
          <DailyPromptCard
            prompt={todayPrompt}
            responseCount={promptResponseCount}
            hasResponded={userRespondedToPrompt}
          />
        </div>
      )}

      {/* Recent Community Posts + Community Highlights */}
      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-6">
        {/* Posts */}
        {posts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="border-l-2 border-primary pl-3 text-base font-semibold">Recent Community Posts</h2>
              <Link href="/community">
                <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
                  View All <ArrowRight className="size-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user.id}
                  userRole={userRole}
                  isLiked={likedIds.has(post.id)}
                  isSaved={savedIds.has(post.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sidebar — highlights */}
        <div className="mt-6 lg:mt-0 space-y-5 lg:sticky lg:top-20 lg:self-start">
          <CommunityHighlights highlights={highlights} />
        </div>
      </div>
    </div>
  )
}
