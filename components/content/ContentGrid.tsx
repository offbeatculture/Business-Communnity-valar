import Link from "next/link"
import { ContentCard } from "@/components/content/ContentCard"
import { BookOpen, FolderOpen, Search } from "lucide-react"
import type { ContentItem } from "@/types"

export function ContentGrid({ items }: { items: ContentItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-12 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
          <BookOpen className="size-8 text-muted-foreground" />
        </div>

        <h3 className="text-lg font-semibold">No content found</h3>

        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Try changing the search, category, or content type to discover more resources.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/content"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <FolderOpen className="size-3.5" />
            View all
          </Link>

          <Link
            href="/content?type=cheat_sheet"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Search className="size-3.5" />
            Browse cheat sheets
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ContentCard key={item.id} item={item} />
      ))}
    </div>
  )
}