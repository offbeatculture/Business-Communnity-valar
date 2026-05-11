import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchProfileById, fetchProfileStats, fetchProfilePosts, fetchProfileTier } from "@/lib/profile"
import { fetchMemberLevel } from "@/lib/engagement"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { ProfileStats } from "@/components/profile/ProfileStats"
import { ProfileActivityFeed } from "@/components/profile/ProfileActivityFeed"

type Props = {
  params: Promise<{ id: string }>
}

export default async function MemberProfilePage({ params }: Props) {
  const { id: profileId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const profile = await fetchProfileById(profileId)

  if (!profile) notFound()

  // If viewing own profile, redirect to /profile
  if (profile.user_id === user.id) {
    redirect("/profile")
  }

  const { data: roleData } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const userRole = (roleData?.role ?? "member") as "member" | "admin"

  const [stats, { posts, hasMore }, memberLevel, memberTier] = await Promise.all([
    fetchProfileStats(profile.user_id),
    fetchProfilePosts(profile.user_id, 1, 5),
    fetchMemberLevel(profile.user_id),
    // Phase 6 polish. Admin-client lookup so the tier badge renders on
    // other members' profiles (subscriptions RLS would otherwise hide it).
    fetchProfileTier(profile.user_id),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ProfileHeader
        profile={profile}
        isOwnProfile={false}
        memberLevel={memberLevel}
        tier={memberTier}
      />
      <ProfileStats stats={stats} />

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Posts</h2>
        <ProfileActivityFeed
          initialPosts={posts}
          initialHasMore={hasMore}
          userId={profile.user_id}
          currentUserId={user.id}
          userRole={userRole}
        />
      </div>
    </div>
  )
}
