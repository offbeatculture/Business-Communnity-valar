import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { PostWithAuthor, CommentWithAuthor } from "@/types"

type PostCategory = "win" | "question" | "discussion" | "introduction"
type PostSort = "newest" | "popular"

type ProfileInfo = { id: string; full_name: string | null; avatar_url: string | null; business_name?: string | null }

/** Batch-fetch profiles by user_ids — returns a Map<user_id, profile> */
async function fetchProfilesByUserIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, ProfileInfo>> {
  if (userIds.length === 0) return new Map()

  const { data } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, avatar_url, business_name")
    .in("user_id", userIds)

  const map = new Map<string, ProfileInfo>()
  for (const p of data ?? []) {
    map.set(p.user_id, {
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      business_name: p.business_name,
    })
  }
  return map
}

type PostFilter = "mine" | "saved"

interface FetchPostsParams {
  category?: PostCategory
  sort?: PostSort
  page?: number
  perPage?: number
  filter?: PostFilter
  userId?: string
}

interface FetchPostsResult {
  posts: PostWithAuthor[]
  count: number
  hasMore: boolean
}

export async function fetchPosts({
  category,
  sort = "newest",
  page = 1,
  perPage = 10,
  filter,
  userId,
}: FetchPostsParams = {}): Promise<FetchPostsResult> {
  const supabase = await createClient()

  // For "saved" filter, first fetch the user's saved post IDs
  let savedPostIds: string[] | undefined
  if (filter === "saved" && userId) {
    const { data: saved } = await supabase
      .from("saved_posts")
      .select("post_id")
      .eq("user_id", userId)

    savedPostIds = saved?.map((s) => s.post_id) ?? []
    if (savedPostIds.length === 0) {
      return { posts: [], count: 0, hasMore: false }
    }
  }

  let query = supabase
    .from("posts")
    .select("*, daily_prompts(prompt_text)", { count: "exact" })

  if (filter === "mine" && userId) {
    query = query.eq("user_id", userId)
  } else if (filter === "saved" && savedPostIds) {
    query = query.in("id", savedPostIds)
  } else if (category) {
    query = query.eq("category", category)
  }

  // Pinned posts always first
  query = query.order("is_pinned", { ascending: false })

  if (sort === "popular") {
    query = query.order("like_count", { ascending: false })
  } else {
    query = query.order("created_at", { ascending: false })
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error("fetchPosts error:", error)
    return { posts: [], count: 0, hasMore: false }
  }

  const total = count ?? 0
  const posts = data ?? []

  // Batch-fetch profiles for post authors
  const userIds = [...new Set(posts.map((p) => p.user_id))]
  const profilesMap = await fetchProfilesByUserIds(supabase, userIds)

  const postsWithAuthors: PostWithAuthor[] = posts.map((p) => ({
    ...p,
    profiles: profilesMap.get(p.user_id) ?? { id: "", full_name: "Anonymous", avatar_url: null, business_name: null },
  }))

  return {
    posts: postsWithAuthors,
    count: total,
    hasMore: to + 1 < total,
  }
}

export async function fetchPostWithDetails(
  postId: string,
  userId: string
) {
  const supabase = await createClient()

  const [postResult, commentsResult, likeResult, saveResult] =
    await Promise.all([
      supabase
        .from("posts")
        .select("*, daily_prompts(prompt_text)")
        .eq("id", postId)
        .single(),
      supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true }),
      supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("saved_posts")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle(),
    ])

  if (postResult.error || !postResult.data) {
    return null
  }

  const post = postResult.data
  const comments = commentsResult.data ?? []

  // Batch-fetch profiles for post author + comment authors
  const allUserIds = [...new Set([post.user_id, ...comments.map((c) => c.user_id)])]
  const profilesMap = await fetchProfilesByUserIds(supabase, allUserIds)

  const postWithAuthor: PostWithAuthor = {
    ...post,
    profiles: profilesMap.get(post.user_id) ?? { id: "", full_name: "Anonymous", avatar_url: null, business_name: null },
  }

  const commentsWithAuthors: CommentWithAuthor[] = comments.map((c) => ({
    ...c,
    profiles: profilesMap.get(c.user_id) ?? { id: "", full_name: "Anonymous", avatar_url: null },
  }))

  return {
    post: postWithAuthor,
    comments: commentsWithAuthors,
    user_has_liked: !!likeResult.data,
    user_has_saved: !!saveResult.data,
  }
}

export async function fetchUserInteractions(
  userId: string,
  postIds: string[]
): Promise<{ likedIds: Set<string>; savedIds: Set<string> }> {
  if (postIds.length === 0) {
    return { likedIds: new Set(), savedIds: new Set() }
  }

  const supabase = await createClient()

  const [likesResult, savesResult] = await Promise.all([
    supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds),
    supabase
      .from("saved_posts")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds),
  ])

  return {
    likedIds: new Set(likesResult.data?.map((l) => l.post_id) ?? []),
    savedIds: new Set(savesResult.data?.map((s) => s.post_id) ?? []),
  }
}

// ── Onboarding checks ──

export async function hasIntroPost(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select("id")
    .eq("user_id", userId)
    .eq("category", "introduction")
    .limit(1)
    .maybeSingle()

  return !!data
}

export async function hasCommentedOnOthersPost(userId: string): Promise<boolean> {
  const supabase = await createClient()

  // Find any comment by this user on a post that isn't theirs
  const { data } = await supabase
    .from("comments")
    .select("id, posts!inner(user_id)")
    .eq("user_id", userId)
    .neq("posts.user_id", userId)
    .limit(1)
    .maybeSingle()

  return !!data
}
