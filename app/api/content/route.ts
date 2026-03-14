import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { ContentItem } from "@/types"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // "cheat_sheet" | "template" | "video_summary" | null
    const category = searchParams.get("category") // category slug or null
    const sort = searchParams.get("sort") ?? "newest"
    const q = searchParams.get("q") ?? ""
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const perPage = 12
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    // Determine which tables to query
    const fetchResources = !type || type === "cheat_sheet" || type === "template"
    const fetchVideos = !type || type === "video_summary"

    const items: ContentItem[] = []
    let totalCount = 0

    if (fetchResources) {
      let query = supabase
        .from("resources")
        .select("*", { count: "exact" })
        .eq("is_published", true)

      if (type === "cheat_sheet" || type === "template") {
        query = query.eq("type", type)
      }
      if (category) {
        query = query.eq("category", category)
      }
      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      }

      const { data, count } = await query

      totalCount += count ?? 0
      ;(data ?? []).forEach((r) =>
        items.push({ ...r, content_type: "resource" } as ContentItem)
      )
    }

    if (fetchVideos) {
      let query = supabase
        .from("video_summaries")
        .select("*", { count: "exact" })
        .eq("is_published", true)

      if (category) {
        query = query.eq("category", category)
      }
      if (q) {
        query = query.or(
          `title.ilike.%${q}%,one_line_takeaway.ilike.%${q}%,full_summary.ilike.%${q}%`
        )
      }

      const { data, count } = await query

      totalCount += count ?? 0
      ;(data ?? []).forEach((v) =>
        items.push({ ...v, content_type: "video_summary" } as ContentItem)
      )
    }

    // Sort
    if (sort === "popular") {
      items.sort((a, b) => b.view_count - a.view_count)
    } else if (sort === "az") {
      items.sort((a, b) => a.title.localeCompare(b.title))
    } else {
      // newest
      items.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }

    // Paginate
    const paginated = items.slice(from, to + 1)

    return NextResponse.json({
      data: paginated,
      count: totalCount,
      page,
      per_page: perPage,
      has_more: from + perPage < totalCount,
    })
  } catch (error) {
    console.error("Content list error:", error)
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    )
  }
}
