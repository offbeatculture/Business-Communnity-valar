import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { fetchCategories } from "@/lib/content"
import { ContentGrid } from "@/components/content/ContentGrid"
import { ContentFilters } from "@/components/content/ContentFilters"
import type { ContentItem } from "@/types"

type Props = {
  searchParams: Promise<{
    type?: string
    category?: string
    sort?: string
    q?: string
    page?: string
  }>
}

export default async function ContentPage({ searchParams }: Props) {
  const params = await searchParams
  const type = params.type
  const category = params.category
  const sort = params.sort ?? "newest"
  const q = params.q ?? ""

  const [categories, items] = await Promise.all([
    fetchCategories(),
    fetchContent({ type, category, sort, q }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Content Library</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Cheat sheets, templates, and video summaries to grow your business.
      </p>

      <Suspense>
        <ContentFilters categories={categories} />
      </Suspense>

      <div className="mt-6">
        <ContentGrid items={items} />
      </div>
    </div>
  )
}

async function fetchContent(filters: {
  type?: string
  category?: string
  sort: string
  q: string
}): Promise<ContentItem[]> {
  const supabase = await createClient()
  const { type, category, sort, q } = filters

  const fetchResources =
    !type || type === "cheat_sheet" || type === "template"
  const fetchVideos = !type || type === "video_summary"

  const items: ContentItem[] = []

  if (fetchResources) {
    let query = supabase
      .from("resources")
      .select("*")
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

    const { data } = await query
    ;(data ?? []).forEach((r) =>
      items.push({ ...r, content_type: "resource" } as ContentItem)
    )
  }

  if (fetchVideos) {
    let query = supabase
      .from("video_summaries")
      .select("*")
      .eq("is_published", true)

    if (category) {
      query = query.eq("category", category)
    }
    if (q) {
      query = query.or(
        `title.ilike.%${q}%,one_line_takeaway.ilike.%${q}%,full_summary.ilike.%${q}%`
      )
    }

    const { data } = await query
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
    items.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  return items
}
