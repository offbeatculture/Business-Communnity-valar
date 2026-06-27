import Link from "next/link"
import { ContentCard } from "@/components/content/ContentCard"
import { BookOpen, FolderOpen } from "lucide-react"
import type { ContentItem } from "@/types"

export function ContentGrid({ items }: { items: ContentItem[] }) {
  const uniqueItems = Array.from(
    new Map(items.map((item) => [`${item.content_type}-${item.id}`, item])).values()
  )

  if (uniqueItems.length === 0) {
    return (
      <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-3xl border border-dashed border-[#C89B3C]/30 bg-[#F7F0E3]/70 px-6 py-12 text-center text-[#4B3A25]">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#C89B3C]/10">
          <BookOpen className="size-8 text-[#C89B3C]" />
        </div>

        <h3 className="font-serif text-xl font-semibold text-[#4B3A25]">
          No recordings found
        </h3>

        <p className="mt-1 max-w-xs text-sm leading-6 text-[#6F7358]">
          Once videos are added from admin, they will appear here.
        </p>

        <Link
          href="/content"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/25 bg-[#F7F0E3] px-3 py-2 text-xs font-medium text-[#6F7358] transition hover:bg-[#E8DDC8] hover:text-[#4B3A25]"
        >
          <FolderOpen className="size-3.5" />
          View all
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
      {uniqueItems.map((item) => (
        <ContentCard key={`${item.content_type}-${item.id}`} item={item} />
      ))}
    </div>
  )
}