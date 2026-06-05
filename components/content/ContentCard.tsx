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
    label: "Cheat Sheet",
    icon: FileText,
    iconWrap: "bg-blue-500/10 text-blue-500",
    chip: "border-blue-500/20 bg-blue-500/10 text-blue-500",
  },
  template: {
    label: "Template",
    icon: FileSpreadsheet,
    iconWrap: "bg-green-500/10 text-green-500",
    chip: "border-green-500/20 bg-green-500/10 text-green-500",
  },
  video_summary: {
    label: "Video",
    icon: Video,
    iconWrap: "bg-purple-500/10 text-purple-500",
    chip: "border-purple-500/20 bg-purple-500/10 text-purple-500",
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
      <Card className="h-full overflow-hidden border-border/60 bg-card transition-all duration-200 hover:border-primary/35 hover:shadow-md hover:shadow-primary/5 active:scale-[0.99]">
        <CardContent className="flex h-full flex-col p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
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

                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Folder className="size-3.5 shrink-0" />
                  <span className="truncate capitalize">{item.category}</span>
                </div>
              </div>
            </div>

            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowUpRight className="size-4" />
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug">
              {item.title}
            </h3>

            {description && (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
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
              <span className="text-primary opacity-0 transition group-hover:opacity-100">
                Open
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}