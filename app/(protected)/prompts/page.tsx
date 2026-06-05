import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchPrompts } from "@/lib/prompts"
import { PromptGrid } from "@/components/prompts/PromptGrid"
import { PromptFilters } from "@/components/prompts/PromptFilters"
import { Sparkles } from "lucide-react"

type Props = {
  searchParams: Promise<{
    category?: string
    q?: string
  }>
}

export default async function PromptsPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const prompts = await fetchPrompts({
    category: params.category,
    q: params.q,
  })

  return (
    <div className="mx-auto w-full max-w-6xl pb-24 sm:pb-8">
      <div className="mb-4">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" />
          AI Prompt Toolkit
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Prompt Library
        </h1>

        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Copy ready-to-use prompts for sales, leads, operations, content, and
          business growth.
        </p>
      </div>

      <Suspense>
        <PromptFilters />
      </Suspense>

      <div className="mt-5">
        <PromptGrid prompts={prompts} />
      </div>
    </div>
  )
}