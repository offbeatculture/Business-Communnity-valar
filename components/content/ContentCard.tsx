import Link from "next/link"
import { Clock, Eye, FileSpreadsheet, FileText, Folder, Video } from "lucide-react"
import type { ContentItem } from "@/types"

const typeConfig = {
  cheat_sheet: {
    label: "Practice Guide",
    icon: FileText,
  },
  template: {
    label: "Worksheet",
    icon: FileSpreadsheet,
  },
  video_summary: {
    label: "Session Video",
    icon: Video,
  },
} as const

function getYouTubeThumbnail(videoId?: string | null) {
  if (!videoId) return null
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export function ContentCard({ item }: { item: ContentItem }) {
const type =
  item.content_type === "video_summary"
    ? "video_summary"
    : item.content_type === "resource" && item.type === "template"
      ? "template"
      : item.content_type === "resource" && item.type === "cheat_sheet"
        ? "cheat_sheet"
        : "video_summary"

const config = typeConfig[type]
const Icon = config.icon

  const thumbnail =
    item.content_type === "video_summary"
      ? getYouTubeThumbnail(item.youtube_video_id)
      : null

  const metaLabel =
    item.content_type === "video_summary"
      ? item.video_duration_minutes
        ? `${item.video_duration_minutes} min`
        : "Recording"
      : config.label

const folderLabel =
  item.content_type === "video_summary"
    ? (item as any).folder?.name ||
      (item as any).content_folders?.name ||
      "Recordings"
    : item.category || "Resources"

  return (
    <Link href={`/content/${item.id}`} className="group block">
      <article className="space-y-3">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#E8DDC8] shadow-sm transition group-hover:shadow-md">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={item.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#F7F0E3]">
              <Icon className="size-10 text-[#8A6A22]" />
            </div>
          )}

          <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />

          {item.content_type === "video_summary" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition group-hover:scale-105">
                <Video className="size-5" />
              </div>
            </div>
          )}

          <div className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-1 text-[11px] font-medium text-white">
            {metaLabel}
          </div>
        </div>

        {/* Text */}
        <div className="flex gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#102719] text-[#F7ECD7]">
            <Icon className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#2F271C] group-hover:text-[#8A6A22]">
              {item.title}
            </h3>

            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#6F7358]">
              <Folder className="size-3.5 shrink-0" />
              <span className="truncate capitalize">{folderLabel}</span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6F7358]">
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3.5" />
                {item.view_count ?? 0} views
              </span>

              {item.content_type === "video_summary" &&
                item.read_time_minutes && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {item.read_time_minutes} min read
                    </span>
                  </>
                )}

              <span>•</span>
              <span>
                {new Date(item.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}