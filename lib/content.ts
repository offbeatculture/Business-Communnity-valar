import { createClient } from "@/lib/supabase/server"
import type { Resource, VideoSummary, Category, ContentItem, ResourceDocument } from "@/types"

export async function fetchCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })

  return data ?? []
}

export async function fetchContentById(
  id: string
): Promise<ContentItem | null> {
  const supabase = await createClient()

  // Try resources first
  const { data: resource } = await supabase
    .from("resources")
    .select("*")
    .eq("id", id)
    .single()

  if (resource) {
    const { data: documents } = await supabase
      .from("resource_documents")
      .select("*")
      .eq("resource_id", resource.id)
      .order("sort_order", { ascending: true })

    return { ...resource, content_type: "resource", documents: (documents as ResourceDocument[]) ?? [] } as ContentItem
  }

  // Try video summaries
  const { data: video } = await supabase
    .from("video_summaries")
    .select("*")
    .eq("id", id)
    .single()

  if (video) {
    return { ...video, content_type: "video_summary" } as ContentItem
  }

  return null
}

export async function fetchRelatedContent(
  category: string,
  excludeId: string,
  limit = 3
): Promise<ContentItem[]> {
  const supabase = await createClient()

  const [{ data: resources }, { data: videos }] = await Promise.all([
    supabase
      .from("resources")
      .select("*")
      .eq("category", category)
      .eq("is_published", true)
      .neq("id", excludeId)
      .limit(limit),
    supabase
      .from("video_summaries")
      .select("*")
      .eq("category", category)
      .eq("is_published", true)
      .neq("id", excludeId)
      .limit(limit),
  ])

  const items: ContentItem[] = [
    ...(resources ?? []).map(
      (r) => ({ ...r, content_type: "resource" }) as ContentItem
    ),
    ...(videos ?? []).map(
      (v) => ({ ...v, content_type: "video_summary" }) as ContentItem
    ),
  ]

  // Sort by newest first, take limit
  items.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return items.slice(0, limit)
}
