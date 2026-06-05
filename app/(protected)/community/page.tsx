import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchPosts, fetchUserInteractions } from "@/lib/community"
import { ComposeBox } from "@/components/community/ComposeBox"
import { CommunityFilters } from "@/components/community/CommunityFilters"
import { PostList } from "@/components/community/PostList"
import { MessageSquare } from "lucide-react"

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, city, business_name, industry")
    .eq("user_id", user.id)
    .single()

  const userRole = (profile?.role ?? "member") as "member" | "admin"

  let composeContent: string | undefined
  let composeCategory:
    | "win"
    | "question"
    | "discussion"
    | "introduction"
    | undefined

  if (params.compose === "introduction" && profile) {
    const name = profile.full_name?.split(" ")[0] ?? ""
    const city = profile.city ?? ""
    const biz = profile.business_name ?? ""
    const industry = profile.industry ?? ""

    composeContent = `Hey everyone! 👋 I'm ${name}${
      city ? ` from ${city}` : ""
    }.${biz ? `\n\nI run ${biz}${industry ? ` in the ${industry} space` : ""}.` : ""}

I joined this community because 

One thing I'm working on right now is `

    composeCategory = "introduction"
  }

  const rawCategory = params.category
  const isSpecialFilter = rawCategory === "mine" || rawCategory === "saved"

  const category = isSpecialFilter
    ? undefined
    : (rawCategory as
        | "win"
        | "question"
        | "discussion"
        | "introduction"
        | undefined)

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
    <div className="mx-auto w-full max-w-4xl pb-24 sm:pb-8">
      <div className="mb-5">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <MessageSquare className="size-3.5" />
          Founder Community
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Community
        </h1>

        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Share wins, ask questions, and learn from founders building alongside
          you.
        </p>
      </div>

      <div className="space-y-4">
        <ComposeBox
          defaultContent={composeContent}
          defaultCategory={composeCategory}
        />

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