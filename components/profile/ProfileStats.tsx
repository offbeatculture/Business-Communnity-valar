import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileText, MessageCircle, Heart } from "lucide-react"
import type { ProfileStats as ProfileStatsType } from "@/types"

type Props = {
  stats: ProfileStatsType
}

const statConfig = [
  { key: "postCount" as const, label: "Posts", icon: FileText },
  { key: "commentCount" as const, label: "Comments", icon: MessageCircle },
  { key: "likesReceived" as const, label: "Likes", icon: Heart },
]

export function ProfileStats({ stats }: Props) {
  return (
    <Card>
      <CardContent className="px-4 py-4">
        <div className="flex items-center justify-around">
          {statConfig.map(({ key, label, icon: Icon }, i) => (
            <div key={key} className="flex items-center">
              <div className="flex flex-col items-center gap-1 px-4">
                <Icon className="size-4 text-muted-foreground" />
                <span className="text-2xl font-bold tabular-nums">
                  {stats[key]}
                </span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              {i < statConfig.length - 1 && (
                <Separator orientation="vertical" className="h-10 ml-4" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
