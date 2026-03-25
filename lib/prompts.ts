import { createClient } from "@/lib/supabase/server"
import type { PromptLibraryItem } from "@/types"

interface FetchPromptsParams {
  category?: string
  q?: string
}

export async function fetchPrompts({ category, q }: FetchPromptsParams = {}): Promise<PromptLibraryItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from("prompt_library")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })

  if (category) {
    query = query.eq("category", category)
  }

  if (q) {
    const sanitized = q.replace(/[,.()"'\\%]/g, "")
    if (sanitized) {
      query = query.or(`title.ilike.%${sanitized}%,prompt_text.ilike.%${sanitized}%`)
    }
  }

  const { data } = await query
  return data ?? []
}

export async function fetchPromptsByContentId(
  contentId: string,
): Promise<PromptLibraryItem[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("prompt_library")
    .select("*")
    .eq("linked_content_id", contentId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })

  return data ?? []
}

export { PROMPT_CATEGORIES } from "./prompt-categories"
export type { PromptCategory } from "./prompt-categories"
