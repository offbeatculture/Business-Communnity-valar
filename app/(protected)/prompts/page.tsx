import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchPrompts } from "@/lib/prompts"
import { PromptGrid } from "@/components/prompts/PromptGrid"
import { PromptFilters } from "@/components/prompts/PromptFilters"

type Props = {
  searchParams: Promise<{
    category?: string
    q?: string
  }>
}

export default async function PromptsPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const prompts = await fetchPrompts({
    category: params.category,
    q: params.q,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Prompt Library</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Copy-paste prompts to grow your business. Use them with ChatGPT, Claude, or any AI tool.
      </p>

      <Suspense>
        <PromptFilters />
      </Suspense>

      <div className="mt-6">
        <PromptGrid prompts={prompts} />
      </div>
    </div>
  )
}
