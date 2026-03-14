import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { fetchPosts } from "@/lib/community"
import { awardPoints } from "@/lib/engagement"
import { GP_VALUES } from "@/lib/engagement-constants"

const createPostSchema = z.object({
  content: z.string().min(1).max(2000),
  category: z.enum(["win", "question", "discussion"]),
  prompt_id: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // Special case: fetch responses for a specific prompt
    const promptId = searchParams.get("prompt_id")
    if (promptId) {
      const limit = Math.min(parseInt(searchParams.get("limit") ?? "5", 10), 20)
      const { data: posts } = await supabase
        .from("posts")
        .select("id, content, user_id, daily_prompts(prompt_text)")
        .eq("prompt_id", promptId)
        .order("created_at", { ascending: false })
        .limit(limit)

      // Fetch profiles for these posts
      const userIds = [...new Set((posts ?? []).map((p) => p.user_id))]
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds)
        : { data: [] }

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]))
      const data = (posts ?? []).map((p) => ({
        id: p.id,
        content: p.content,
        profiles: profileMap.get(p.user_id) ?? { full_name: "Anonymous", avatar_url: null },
      }))

      return NextResponse.json({ data })
    }

    const rawCategory = searchParams.get("category")
    const isSpecialFilter = rawCategory === "mine" || rawCategory === "saved"
    const category = isSpecialFilter ? undefined : (rawCategory as "win" | "question" | "discussion" | null)
    const filter = isSpecialFilter ? (rawCategory as "mine" | "saved") : undefined
    const sort = (searchParams.get("sort") as "newest" | "popular") ?? "newest"
    const page = parseInt(searchParams.get("page") ?? "1", 10)

    const result = await fetchPosts({
      category: category || undefined,
      sort,
      page,
      perPage: 10,
      filter,
      userId: user.id,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("GET /api/posts error:", error)
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createPostSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      content: parsed.data.content,
      category: parsed.data.category,
    }
    if (parsed.data.prompt_id) {
      insertData.prompt_id = parsed.data.prompt_id
    }

    const { data: post, error } = await supabase
      .from("posts")
      .insert(insertData)
      .select("*")
      .single()

    if (error) {
      console.error("Create post error:", error)
      return NextResponse.json(
        { error: "Failed to create post" },
        { status: 500 }
      )
    }

    // Award GP for post creation (fire-and-forget)
    awardPoints(user.id, "post", GP_VALUES.post, post.id).catch(() => {})

    // Award prompt response bonus if responding to a daily prompt
    if (parsed.data.prompt_id) {
      awardPoints(user.id, "prompt_response", GP_VALUES.prompt_response, post.id).catch(() => {})
    }

    // Fetch the author's profile separately (no direct FK between posts and profiles)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, business_name")
      .eq("user_id", user.id)
      .single()

    const postWithAuthor = {
      ...post,
      profiles: profile ?? { id: "", full_name: "Anonymous", avatar_url: null, business_name: null },
    }

    return NextResponse.json(postWithAuthor, { status: 201 })
  } catch (error) {
    console.error("POST /api/posts error:", error)
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    )
  }
}
