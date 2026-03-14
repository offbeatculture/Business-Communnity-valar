import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Clock, FileText, Video, FileSpreadsheet } from "lucide-react"
import type { ContentItem } from "@/types"

const typeConfig = {
  cheat_sheet: { label: "Cheat Sheet", icon: FileText, color: "bg-blue-500/10 text-blue-500" },
  template: { label: "Template", icon: FileSpreadsheet, color: "bg-green-500/10 text-green-500" },
  video_summary: { label: "Video Summary", icon: Video, color: "bg-purple-500/10 text-purple-500" },
} as const

export function ContentCard({ item }: { item: ContentItem }) {
  const type =
    item.content_type === "resource" ? item.type : "video_summary"
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
    <Link href={`/content/${item.id}`}>
      <Card className="h-full hover:border-red-500/50 transition-colors cursor-pointer">
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className={config.color}>
              <Icon className="size-3" />
              {config.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {item.category}
            </Badge>
          </div>

          <h3 className="font-semibold text-sm mb-1.5 line-clamp-2">
            {item.title}
          </h3>

          {description && (
            <p className="text-muted-foreground text-xs line-clamp-2 mb-3">
              {description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="size-3" />
              {item.view_count}
            </span>
            {timeSaving && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {timeSaving}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
