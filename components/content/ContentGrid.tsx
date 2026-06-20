import Link from "next/link"
import { ContentCard } from "@/components/content/ContentCard"
import { BookOpen, FolderOpen, Search } from "lucide-react"
import type { ContentItem } from "@/types"

export function ContentGrid({ items }: { items: ContentItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-3xl border border-dashed border-[#C89B3C]/30 bg-[#F7F0E3]/70 px-6 py-12 text-center text-[#4B3A25]">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#C89B3C]/10">
          <BookOpen className="size-8 text-[#C89B3C]" />
        </div>

        <h3 className="font-serif text-xl font-semibold text-[#4B3A25]">
          No content found
        </h3>

        <p className="mt-1 max-w-xs text-sm leading-6 text-[#6F7358]">
          Try changing the search, category, or content type to discover more
          breathwork resources.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/content"
            className="inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/25 bg-[#F7F0E3] px-3 py-2 text-xs font-medium text-[#6F7358] transition hover:bg-[#E8DDC8] hover:text-[#4B3A25]"
          >
            <FolderOpen className="size-3.5" />
            View all
          </Link>

          <Link
            href="/content?type=cheat_sheet"
            className="inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/25 bg-[#F7F0E3] px-3 py-2 text-xs font-medium text-[#6F7358] transition hover:bg-[#E8DDC8] hover:text-[#4B3A25]"
          >
            <Search className="size-3.5" />
            Browse practice guides
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