import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchPosts, fetchUserInteractions } from "@/lib/community"
import { ComposeBox } from "@/components/community/ComposeBox"
import { CommunityFilters } from "@/components/community/CommunityFilters"
import { PostList } from "@/components/community/PostList"

type Props = {
  searchParams: Promise<{
    category?: string
    sort?: string
    page?: string
    compose?: string
    compose_category?: string
  }>
}

export default async function CommunityPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, city, business_name, industry")
    .eq("user_id", user.id)
    .single()

  const userRole = (profile?.role ?? "member") as "member" | "admin"

  // Build intro template if compose=introduction
  let composeContent: string | undefined
  let composeCategory: "win" | "question" | "discussion" | "introduction" | undefined
  if (params.compose === "introduction" && profile) {
    const name = profile.full_name?.split(" ")[0] ?? ""
    const city = profile.city ?? ""
    const biz = profile.business_name ?? ""
    const industry = profile.industry ?? ""
    composeContent = `Hey everyone! 👋 I'm ${name}${city ? ` from ${city}` : ""}.${biz ? `\n\nI run ${biz}${industry ? ` in the ${industry} space` : ""}.` : ""}\n\nI joined this community because \n\nOne thing I'm working on right now is `
    composeCategory = "introduction"
  }

  const rawCategory = params.category
  const isSpecialFilter = rawCategory === "mine" || rawCategory === "saved"
  const category = isSpecialFilter ? undefined : (rawCategory as "win" | "question" | "discussion" | "introduction" | undefined)
  const filter = isSpecialFilter ? (rawCategory as "mine" | "saved") : undefined
  const sort = (params.sort as "newest" | "popular") ?? "newest"

  const { posts, hasMore } = await fetchPosts({
    category,
    sort,
    page: 1,
    perPage: 10,
    filter,
    userId: user.id,
  })

  const postIds = posts.map((p) => p.id)
  const { likedIds, savedIds } = await fetchUserInteractions(user.id, postIds)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Community</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Share wins, ask questions, and connect with fellow entrepreneurs.
      </p>

      <div className="space-y-6">
        <ComposeBox defaultContent={composeContent} defaultCategory={composeCategory} />

        <Suspense>
          <CommunityFilters />
        </Suspense>

        <PostList
          initialPosts={posts}
          initialHasMore={hasMore}
          currentUserId={user.id}
          userRole={userRole}
          likedIds={Array.from(likedIds)}
          savedIds={Array.from(savedIds)}
        />
      </div>
    </div>
  )
}
