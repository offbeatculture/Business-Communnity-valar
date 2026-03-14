import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { fetchProfile, fetchProfileStats } from "@/lib/profile"
import { fetchPosts, fetchUserInteractions } from "@/lib/community"
import { fetchMemberLevel, fetchTodayPrompt, fetchPromptResponseCount, hasUserRespondedToPrompt, fetchWeeklyHighlights } from "@/lib/engagement"
import { ProfileStats } from "@/components/profile/ProfileStats"
import { SubscriptionBadge } from "@/components/profile/SubscriptionBadge"
import { PostCard } from "@/components/community/PostCard"
import { GrowthCard } from "@/components/engagement/GrowthCard"
import { DailyPromptCard } from "@/components/engagement/DailyPromptCard"
import { CommunityHighlights } from "@/components/engagement/CommunityHighlights"
import { OnboardingChecklist } from "@/components/engagement/OnboardingChecklist"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, BookOpen, Users, ChevronRight, ArrowRight } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [profile, stats] = await Promise.all([
    fetchProfile(user.id),
    fetchProfileStats(user.id),
  ])

  if (!profile) redirect("/login")

  const { data: roleData } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const userRole = (roleData?.role ?? "member") as "member" | "admin"

  // Fetch engagement data in parallel
  const [memberLevel, todayPrompt, highlights, { posts }] = await Promise.all([
    fetchMemberLevel(user.id),
    fetchTodayPrompt(),
    fetchWeeklyHighlights(),
    fetchPosts({ page: 1, perPage: 3 }),
  ])

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

  // Check if new member (< 7 days old, Level 1)
  const accountAge = Date.now() - new Date(profile.created_at).getTime()
  const hasProfileSetup = !!(profile.business_name && profile.city)
  const allOnboardingDone = hasProfileSetup && stats.postCount > 0 && userRespondedToPrompt
  const isNewMember = accountAge < 7 * 24 * 60 * 60 * 1000 && (memberLevel?.current_level ?? 1) === 1 && !allOnboardingDone

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Welcome — full width */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {firstName}</h1>
        <div className="mt-2">
          <SubscriptionBadge
            status={profile.subscription_status}
            expiresAt={profile.subscription_expires_at}
          />
        </div>
      </div>

      {/* Two-column grid on desktop, single column on mobile */}
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">
        {/* Main column — feed */}
        <div className="space-y-6">
          {/* Daily Prompt Card */}
          {todayPrompt && (
            <DailyPromptCard
              prompt={todayPrompt}
              responseCount={promptResponseCount}
              hasResponded={userRespondedToPrompt}
            />
          )}

          {/* Recent Community Posts */}
          {posts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="border-l-2 border-red-500 pl-3 text-base font-semibold">Recent Community Posts</h2>
                <Link href="/community">
                  <Button variant="outline" size="sm" className="border-red-500/30 text-red-500 hover:bg-red-500/10">
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
        </div>

        {/* Sidebar column */}
        <div className="mt-6 lg:mt-0 space-y-5 lg:sticky lg:top-20 lg:self-start">
          {/* Growth Card or Onboarding Checklist */}
          {memberLevel && (
            isNewMember ? (
              <OnboardingChecklist
                firstName={firstName}
                memberLevel={memberLevel}
                stats={stats}
                hasRespondedToPrompt={userRespondedToPrompt}
                hasProfileSetup={hasProfileSetup}
              />
            ) : (
              <GrowthCard memberLevel={memberLevel} />
            )
          )}

          {/* Quick Actions — compact sidebar format */}
          <Card>
            <CardContent className="p-0">
              <Link href="/community" className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                <Trophy className="size-4 text-red-500" />
                <span className="text-sm font-medium">Share a Win</span>
                <ChevronRight className="size-4 text-muted-foreground ml-auto" />
              </Link>
              <Link href="/content" className="flex items-center gap-3 px-4 py-3 border-t hover:bg-muted/50 transition-colors">
                <BookOpen className="size-4 text-red-500" />
                <span className="text-sm font-medium">Browse Content</span>
                <ChevronRight className="size-4 text-muted-foreground ml-auto" />
              </Link>
              <Link href="/community" className="flex items-center gap-3 px-4 py-3 border-t hover:bg-muted/50 transition-colors">
                <Users className="size-4 text-red-500" />
                <span className="text-sm font-medium">View Members</span>
                <ChevronRight className="size-4 text-muted-foreground ml-auto" />
              </Link>
            </CardContent>
          </Card>

          {/* Community Highlights */}
          <CommunityHighlights highlights={highlights} />

          {/* Stats */}
          <ProfileStats stats={stats} />
        </div>
      </div>
    </div>
  )
}
