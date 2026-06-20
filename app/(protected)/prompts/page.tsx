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
    <div className="mx-auto w-full max-w-6xl pb-24 text-[#4B3A25] sm:pb-8">
      <div className="mb-5">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#F7F0E3] px-3 py-1 text-xs font-medium text-[#8A6A22]">
          <Sparkles className="size-3.5" />
          Practice Prompt Library
        </div>

        <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#4B3A25] sm:text-4xl">
          Daily Practice Prompts
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F7358]">
          Explore ready-to-use breathwork reflection prompts for calmness,
          consistency, self-awareness, and daily inner practice.
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