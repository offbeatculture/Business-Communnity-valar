import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { fetchProfile, fetchProfileStats } from "@/lib/profile"
import { fetchPosts } from "@/lib/community"
import { fetchMemberLevel } from "@/lib/engagement"
import { getUserTier } from "@/lib/auth/tier"
import { ProfileActivityFeed } from "@/components/profile/ProfileActivityFeed"
import { SavedPostsList } from "@/components/profile/SavedPostsList"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  User,
  MessageSquare,
  Heart,
  Bookmark,
  Calendar,
  Crown,
  Sparkles,
} from "lucide-react"

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [
    profile,
    stats,
    memberLevel,
    myPosts,
    savedPosts,
    { data: latestSub },
    userTier,
  ] = await Promise.all([
    fetchProfile(user.id),
    fetchProfileStats(user.id),
    fetchMemberLevel(user.id),
    fetchPosts({ filter: "mine", userId: user.id, page: 1, perPage: 5 }),
    fetchPosts({ filter: "saved", userId: user.id, page: 1, perPage: 5 }),
    supabase
      .from("subscriptions")
      .select("plan_name, starts_at, expires_at")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .single(),
    getUserTier(),
  ])

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
              <User className="size-7 text-primary" />
            </div>

            <div>
              <h1 className="text-xl font-semibold">Complete your profile</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your account is active, but your profile details are missing.
              </p>
            </div>

            <Link href="/profile/edit">
              <Button>Set up profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const userRole = profile.role ?? "member"
  const fullName = profile.full_name || "Member"
  const firstLetter = fullName.charAt(0).toUpperCase()

  const planName =
    latestSub?.plan_name || userTier?.tier || profile.subscription_status || "Member"

  const expiresAt = latestSub?.expires_at || profile.subscription_expires_at

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-24 sm:pb-10">
      {/* Minimal Profile Header */}
      <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
                {firstLetter}
              </div>

              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  My Profile
                </p>

                <h1 className="mt-1 truncate text-2xl font-bold tracking-tight">
                  {fullName}
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  {user.email}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {userRole}
                  </span>

                  {memberLevel && (
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                      Level {memberLevel.current_level}
                    </span>
                  )}

                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    {planName}
                  </span>
                </div>
              </div>
            </div>

            <Link href="/profile/edit">
              <Button variant="outline">Edit Profile</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Simple Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ProfileMiniStat
          icon={<MessageSquare className="size-4" />}
          label="Posts"
          value={stats.postCount}
        />

        <ProfileMiniStat
          icon={<Sparkles className="size-4" />}
          label="Comments"
          value={stats.commentCount}
        />

        <ProfileMiniStat
          icon={<Heart className="size-4" />}
          label="Likes"
          value={stats.likesReceived}
        />

        <ProfileMiniStat
          icon={<Bookmark className="size-4" />}
          label="Saved"
          value={savedPosts.posts.length}
        />
      </div>

      {/* Membership Summary */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Crown className="size-5 text-primary" />
            </div>

            <div>
              <p className="text-sm font-medium">Membership</p>
              <p className="mt-1 text-sm text-muted-foreground">{planName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>

            <div>
              <p className="text-sm font-medium">Growth Points</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {memberLevel?.total_gp ?? 0} GP earned
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Calendar className="size-5 text-primary" />
            </div>

            <div>
              <p className="text-sm font-medium">Valid Until</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {expiresAt
                  ? new Date(expiresAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Not available"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <Tabs defaultValue="posts">
            <TabsList className="grid w-full grid-cols-2 bg-secondary">
              <TabsTrigger value="posts">My Posts</TabsTrigger>
              <TabsTrigger value="saved">Saved Posts</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-5">
              <ProfileActivityFeed
                initialPosts={myPosts.posts}
                initialHasMore={myPosts.hasMore}
                userId={user.id}
                currentUserId={user.id}
                userRole={userRole}
              />
            </TabsContent>

            <TabsContent value="saved" className="mt-5">
              <SavedPostsList
                initialPosts={savedPosts.posts}
                initialHasMore={savedPosts.hasMore}
                currentUserId={user.id}
                userRole={userRole}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileMiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>

        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}