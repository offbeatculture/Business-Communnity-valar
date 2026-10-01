import Link from "next/link"
import { ArrowRight, Folder, Play, Video } from "lucide-react"

/**
 * One grid for everything in the library.
 *
 * Courses and monthly folders are both just "a collection of recordings you
 * open and watch", so they render as the same card and sit in one list rather
 * than under separate headings. A course carries a small COURSE badge so the
 * curated series are still recognisable at a glance.
 */

export type LibraryEntry = {
  id: string
  /** Where the card goes. */
  href: string
  title: string
  description: string | null
  /**
   * The collection's own cover image. Null leaves the tile empty — a folder
   * never borrows a recording's thumbnail, so an unset cover looks unset.
   */
  cover: string | null
  videoCount: number
  kind: "course" | "folder"
  /** Lower sorts first. */
  sortOrder: number
  createdAt: string
}

export function LibraryGrid({ entries }: { entries: LibraryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-3xl border border-dashed border-[#C89B3C]/30 bg-[#F7F0E3]/70 px-6 py-12 text-center text-[#4B3A25]">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#C89B3C]/10">
          <Folder className="size-8 text-[#C89B3C]" />
        </div>

        <h3 className="font-serif text-xl font-semibold text-[#4B3A25]">
          Nothing here yet
        </h3>

        <p className="mt-1 max-w-xs text-sm leading-6 text-[#6F7358]">
          Create folders from the admin panel and assign videos to them.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <Link key={entry.id} href={entry.href} className="group block">
          <article className="space-y-3">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#F7F0E3] shadow-sm ring-1 ring-[#C89B3C]/15 transition group-hover:shadow-md">
              {entry.cover ? (
                <img
                  src={entry.cover}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                // No cover set: a plain tile, deliberately empty.
                <div className="h-full w-full bg-gradient-to-br from-[#F7F0E3] to-[#E8DDC8]" />
              )}

              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/15">
                <div className="flex size-12 items-center justify-center rounded-full bg-[#D4A936] text-[#2F271C] opacity-0 shadow-lg transition group-hover:scale-105 group-hover:opacity-100">
                  <Play className="size-5 fill-current" />
                </div>
              </div>

              {entry.kind === "course" && (
                <div className="absolute left-2 top-2 rounded-md bg-[#102719]/85 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#F7ECD7]">
                  Course
                </div>
              )}

              <div className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-1 text-[11px] font-medium text-white">
                {entry.videoCount} video{entry.videoCount === 1 ? "" : "s"}
              </div>
            </div>

            <div>
              <h3 className="line-clamp-2 font-serif text-xl font-bold leading-snug text-[#2F271C] group-hover:text-[#8A6A22]">
                {entry.title}
              </h3>

              {entry.description ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6F7358]">
                  {entry.description}
                </p>
              ) : (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-[#6F7358]">
                  <Video className="size-3.5 shrink-0" />
                  <span>
                    {entry.videoCount} recording
                    {entry.videoCount === 1 ? "" : "s"}
                  </span>
                </div>
              )}

              <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#8A6A22]">
                {entry.kind === "course" ? "Start watching" : "Open folder"}
                <ArrowRight className="size-3.5" />
              </div>
            </div>
          </article>
        </Link>
      ))}
    </div>
  )
}
