import Link from "next/link"
import { PromptCard } from "./PromptCard"
import { Search, Sparkles, Target } from "lucide-react"
import type { PromptLibraryItem } from "@/types"

type Props = {
  prompts: PromptLibraryItem[]
}

export function PromptGrid({ prompts }: Props) {
  if (prompts.length === 0) {
    return (
      <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-12 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="size-8 text-primary" />
        </div>

        <h3 className="text-lg font-semibold">No prompts found</h3>

        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Try changing the search or category to discover more copy-ready AI prompts.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/prompts"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Search className="size-3.5" />
            View all prompts
          </Link>

          <Link
            href="/prompts?category=offer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Target className="size-3.5" />
            Browse offer prompts
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} />
      ))}
    </div>
  )
}