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

    composeContent = `Namaste everyone! 👋 I'm ${name}${
      city ? ` from ${city}` : ""
    }.

I joined this Daily Breathwork community because 

One thing I want to build consistency with is `

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
    <div className="mx-auto w-full max-w-4xl pb-24 text-[#4B3A25] sm:pb-8">
      <div className="mb-5">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#F7F0E3] px-3 py-1 text-xs font-medium text-[#8A6A22]">
          <MessageSquare className="size-3.5" />
          Daily Breathwork Community
        </div>

        <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#4B3A25] sm:text-4xl">
          Breathwork Community
        </h1>

        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#6F7358]">
          Share your reflections, ask questions, celebrate practice wins, and
          stay connected with others on the Daily Breathwork journey.
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