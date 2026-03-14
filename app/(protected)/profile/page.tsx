import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchProfile, fetchProfileStats, fetchProfilePosts } from "@/lib/profile"
import { fetchPosts } from "@/lib/community"
import { fetchMemberLevel } from "@/lib/engagement"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { ProfileStats } from "@/components/profile/ProfileStats"
import { ProfileActivityFeed } from "@/components/profile/ProfileActivityFeed"
import { SavedPostsList } from "@/components/profile/SavedPostsList"
import { SubscriptionBadge } from "@/components/profile/SubscriptionBadge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [profile, stats, memberLevel] = await Promise.all([
    fetchProfile(user.id),
    fetchProfileStats(user.id),
    fetchMemberLevel(user.id),
  ])

  if (!profile) redirect("/login")

  const { data: roleData } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const userRole = (roleData?.role ?? "member") as "member" | "admin"

  // Fetch recent posts and saved posts
  const [myPosts, savedPosts] = await Promise.all([
    fetchPosts({ filter: "mine", userId: user.id, page: 1, perPage: 5 }),
    fetchPosts({ filter: "saved", userId: user.id, page: 1, perPage: 5 }),
  ])

  // Fetch latest subscription details
  const { data: latestSub } = await supabase
    .from("subscriptions")
    .select("plan_name, starts_at, expires_at")
    .eq("user_id", user.id)
    .order("expires_at", { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ProfileHeader profile={profile} isOwnProfile memberLevel={memberLevel} />
      <ProfileStats stats={stats} />

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          <ProfileActivityFeed
            initialPosts={myPosts.posts}
            initialHasMore={myPosts.hasMore}
            userId={user.id}
            currentUserId={user.id}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          <SavedPostsList
            initialPosts={savedPosts.posts}
            initialHasMore={savedPosts.hasMore}
            currentUserId={user.id}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="subscription" className="mt-4">
          <div className="space-y-3">
            <SubscriptionBadge
              status={profile.subscription_status}
              expiresAt={profile.subscription_expires_at}
            />
            {latestSub && (
              <div className="text-sm text-muted-foreground">
                <p>Plan: {latestSub.plan_name}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
