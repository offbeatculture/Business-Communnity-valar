import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Profile, ProfileWithSubscription, ProfileStats, AdminStats, PostWithAuthor } from "@/types"

// ── Fetch own or any profile by user_id ──

export async function fetchProfile(userId: string): Promise<ProfileWithSubscription | null> {
  const supabase = await createClient()

  const [profileRes, subRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("subscriptions")
      .select("expires_at")
      .eq("user_id", userId)
      .order("expires_at", { ascending: false })
      .limit(1)
      .single(),
  ])

  const profile = profileRes.data
  if (!profile) return null

  const sub = subRes.data

  let subscription_status: ProfileWithSubscription["subscription_status"] = "none"
  let subscription_expires_at: string | null = null

  if (sub) {
    subscription_expires_at = sub.expires_at
    subscription_status = new Date(sub.expires_at) > new Date() ? "active" : "expired"
  }

  return { ...profile, subscription_status, subscription_expires_at }
}

// ── Fetch profile by profile table `id` (for public member pages) ──

export async function fetchProfileById(profileId: string): Promise<ProfileWithSubscription | null> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single()

  if (!profile) return null

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", profile.user_id)
    .order("expires_at", { ascending: false })
    .limit(1)
    .single()

  let subscription_status: ProfileWithSubscription["subscription_status"] = "none"
  let subscription_expires_at: string | null = null

  if (sub) {
    subscription_expires_at = sub.expires_at
    subscription_status = new Date(sub.expires_at) > new Date() ? "active" : "expired"
  }

  return { ...profile, subscription_status, subscription_expires_at }
}

// ── Profile stats (post count, comment count, likes received) ──

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = await createClient()

  const [postsRes, commentsRes, likesRes] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("likes")
      .select("id, posts!inner(user_id)", { count: "exact", head: true })
      .eq("posts.user_id", userId),
  ])

  return {
    postCount: postsRes.count ?? 0,
    commentCount: commentsRes.count ?? 0,
    likesReceived: likesRes.count ?? 0,
  }
}

// ── User's recent posts ──

type ProfileInfo = { id: string; full_name: string | null; avatar_url: string | null; business_name?: string | null }

export async function fetchProfilePosts(
  userId: string,
  page = 1,
  perPage = 5
): Promise<{ posts: PostWithAuthor[]; hasMore: boolean }> {
  const supabase = await createClient()

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data, count } = await supabase
    .from("posts")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to)

  const posts = data ?? []

  // Fetch profile for this user
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, business_name")
    .eq("user_id", userId)
    .single()

  const profile: ProfileInfo = profileData ?? { id: "", full_name: "Anonymous", avatar_url: null, business_name: null }

  const postsWithAuthors: PostWithAuthor[] = posts.map((p) => ({
    ...p,
    profiles: profile,
  }))

  return {
    posts: postsWithAuthors,
    hasMore: (count ?? 0) > to + 1,
  }
}

// ── Fetch all members (admin) ──

interface FetchAllMembersParams {
  search?: string
  industry?: string
  status?: "active" | "expired" | "all"
  page?: number
  perPage?: number
}

export async function fetchAllMembers({
  search,
  industry,
  status = "all",
  page = 1,
  perPage = 20,
}: FetchAllMembersParams = {}): Promise<{ members: ProfileWithSubscription[]; hasMore: boolean; total: number }> {
  const admin = createAdminClient()

  // Build profiles query
  let query = admin
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,business_name.ilike.%${search}%,city.ilike.%${search}%`)
  }

  if (industry) {
    query = query.eq("industry", industry)
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1
  query = query.range(from, to)

  const { data: profiles, count } = await query

  if (!profiles || profiles.length === 0) {
    return { members: [], hasMore: false, total: count ?? 0 }
  }

  // Batch-fetch latest subscriptions for all these users
  const userIds = profiles.map((p) => p.user_id)

  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, expires_at")
    .in("user_id", userIds)
    .order("expires_at", { ascending: false })

  // Build a map: user_id → latest subscription
  const subMap = new Map<string, { expires_at: string }>()
  for (const sub of subs ?? []) {
    if (!subMap.has(sub.user_id)) {
      subMap.set(sub.user_id, { expires_at: sub.expires_at })
    }
  }

  const members: ProfileWithSubscription[] = profiles.map((p) => {
    const sub = subMap.get(p.user_id)
    let subscription_status: ProfileWithSubscription["subscription_status"] = "none"
    let subscription_expires_at: string | null = null

    if (sub) {
      subscription_expires_at = sub.expires_at
      subscription_status = new Date(sub.expires_at) > new Date() ? "active" : "expired"
    }

    return { ...p, subscription_status, subscription_expires_at }
  })

  // Filter by status if needed (post-fetch since we can't join easily)
  const filtered = status === "all"
    ? members
    : members.filter((m) => m.subscription_status === status)

  return {
    members: filtered,
    hasMore: (count ?? 0) > to + 1,
    total: count ?? 0,
  }
}

// ── Admin stats ──

export async function fetchAdminStats(): Promise<AdminStats> {
  const admin = createAdminClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [membersRes, subsRes, postsRes, newMembersRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .gte("expires_at", now.toISOString()),
    admin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth),
  ])

  return {
    totalMembers: membersRes.count ?? 0,
    activeSubscriptions: subsRes.count ?? 0,
    postsThisMonth: postsRes.count ?? 0,
    newMembersThisMonth: newMembersRes.count ?? 0,
  }
}
