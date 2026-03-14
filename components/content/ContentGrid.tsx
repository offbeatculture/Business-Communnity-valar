import { ContentCard } from "@/components/content/ContentCard"
import { BookOpen } from "lucide-react"
import type { ContentItem } from "@/types"

export function ContentGrid({ items }: { items: ContentItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-1">No content found</h3>
        <p className="text-muted-foreground text-sm">
          Try adjusting your filters or check back later.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item) => (
        <ContentCard key={item.id} item={item} />
      ))}
    </div>
  )
}
