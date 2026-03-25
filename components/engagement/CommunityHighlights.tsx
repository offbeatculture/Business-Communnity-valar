import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, MessageSquare, Sparkles } from "lucide-react"
import type { WeeklyHighlights } from "@/types"

type Props = {
  highlights: WeeklyHighlights
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function MemberRow({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-6">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="text-sm truncate">{name}</span>
    </div>
  )
}

export function CommunityHighlights({ highlights }: Props) {
  const hasAny =
    highlights.most_helpful.length > 0 ||
    highlights.top_responders.length > 0 ||
    highlights.rising_star

  if (!hasAny) return null

  return (
    <Card>
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="border-l-2 border-primary pl-3 text-base font-semibold">This Week in the Community</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {highlights.most_helpful.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Heart className="size-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Most Helpful</span>
            </div>
            <div className="space-y-1.5">
              {highlights.most_helpful.map((m) => (
                <MemberRow key={m.user_id} name={m.full_name} avatarUrl={m.avatar_url} />
              ))}
            </div>
          </div>
        )}

        {highlights.top_responders.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare className="size-3.5 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Top Responders</span>
            </div>
            <div className="space-y-1.5">
              {highlights.top_responders.map((m) => (
                <MemberRow key={m.user_id} name={m.full_name} avatarUrl={m.avatar_url} />
              ))}
            </div>
          </div>
        )}

        {highlights.rising_star && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="size-3.5 text-yellow-500" />
              <span className="text-xs font-medium text-muted-foreground">Rising Star</span>
            </div>
            <MemberRow
              name={highlights.rising_star.full_name}
              avatarUrl={highlights.rising_star.avatar_url}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
