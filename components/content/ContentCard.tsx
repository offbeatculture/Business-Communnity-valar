import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowUpRight,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  Folder,
  Video,
} from "lucide-react"
import type { ContentItem } from "@/types"

const typeConfig = {
  cheat_sheet: {
    label: "Practice Guide",
    icon: FileText,
    iconWrap: "bg-[#C89B3C]/10 text-[#8A6A22]",
    chip: "border-[#C89B3C]/25 bg-[#C89B3C]/10 text-[#8A6A22]",
  },
  template: {
    label: "Worksheet",
    icon: FileSpreadsheet,
    iconWrap: "bg-[#6F7358]/10 text-[#4B3A25]",
    chip: "border-[#6F7358]/25 bg-[#6F7358]/10 text-[#4B3A25]",
  },
  video_summary: {
    label: "Session Video",
    icon: Video,
    iconWrap: "bg-[#1F2A1B]/10 text-[#1F2A1B]",
    chip: "border-[#1F2A1B]/20 bg-[#1F2A1B]/10 text-[#1F2A1B]",
  },
} as const

export function ContentCard({ item }: { item: ContentItem }) {
  const type = item.content_type === "resource" ? item.type : "video_summary"
  const config = typeConfig[type]
  const Icon = config.icon

  const description =
    item.content_type === "resource"
      ? item.description
      : item.one_line_takeaway ?? item.full_summary

  const timeSaving =
    item.content_type === "video_summary" && item.read_time_minutes
      ? `${item.read_time_minutes} min read`
      : null

  return (
    <Link href={`/content/${item.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden border-[#C89B3C]/20 bg-[#F7F0E3] text-[#4B3A25] shadow-sm shadow-black/5 transition-all duration-200 hover:border-[#C89B3C]/40 hover:shadow-md hover:shadow-black/10 active:scale-[0.99]">
        <CardContent className="flex h-full flex-col p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${config.iconWrap}`}
              >
                <Icon className="size-5" />
              </div>

              <div className="min-w-0">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.chip}`}
                >
                  {config.label}
                </span>

                <div className="mt-1 flex items-center gap-1.5 text-xs text-[#6F7358]">
                  <Folder className="size-3.5 shrink-0 text-[#8A6A22]" />
                  <span className="truncate capitalize">{item.category}</span>
                </div>
              </div>
            </div>

            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E8DDC8] text-[#6F7358] transition group-hover:bg-[#C89B3C] group-hover:text-[#122015]">
              <ArrowUpRight className="size-4" />
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <h3 className="line-clamp-2 font-serif text-lg font-semibold leading-snug text-[#4B3A25]">
              {item.title}
            </h3>

            {description && (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6F7358]">
                {description}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#C89B3C]/20 pt-3 text-xs text-[#6F7358]">
            <span className="flex items-center gap-1.5">
              <Eye className="size-3.5" />
              {item.view_count} views
            </span>

            {timeSaving ? (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {timeSaving}
              </span>
            ) : (
              <span className="text-[#8A6A22] opacity-0 transition group-hover:opacity-100">
                Open
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}