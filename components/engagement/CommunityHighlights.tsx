import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import {
  Crown,
  Heart,
  MessageSquare,
  Sparkles,
  Trophy,
  Medal,
  Flame,
} from "lucide-react"
import type { WeeklyHighlights } from "@/types"

type Props = {
  highlights: WeeklyHighlights
}

type HighlightMember = {
  user_id: string
  full_name: string
  avatar_url: string | null
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function WinnerAvatar({
  name,
  avatarUrl,
  rank,
  size = "md",
}: {
  name: string
  avatarUrl: string | null
  rank: number
  size?: "sm" | "md" | "lg"
}) {
  const sizeClass =
    size === "lg" ? "size-16" : size === "md" ? "size-12" : "size-10"

  return (
    <div className="relative">
      <Avatar className={`${sizeClass} border-2 border-background shadow-md`}>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>

      <div
        className={`absolute -right-1 -top-1 flex items-center justify-center rounded-full border border-background text-[10px] font-bold ${
          rank === 1
            ? "size-6 bg-yellow-500 text-black"
            : rank === 2
              ? "size-5 bg-zinc-300 text-black"
              : "size-5 bg-orange-400 text-black"
        }`}
      >
        {rank}
      </div>
    </div>
  )
}

function PodiumCard({
  member,
  label,
  icon,
  rank,
  featured = false,
}: {
  member: HighlightMember
  label: string
  icon: React.ReactNode
  rank: number
  featured?: boolean
}) {
  return (
    <div
      className={`relative rounded-2xl border p-3 text-center ${
        featured
          ? "border-yellow-500/30 bg-yellow-500/10 shadow-lg shadow-yellow-500/5"
          : "border-border/60 bg-background/40"
      }`}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] font-bold text-black shadow">
          #1
        </div>
      )}

      <div className="flex justify-center pt-1">
        <WinnerAvatar
          name={member.full_name}
          avatarUrl={member.avatar_url}
          rank={rank}
          size={featured ? "lg" : "md"}
        />
      </div>

      <div className="mt-3 flex justify-center">
        <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
          {icon}
          {label}
        </div>
      </div>

      <p className="mt-2 truncate text-sm font-semibold">{member.full_name}</p>
      <p className="text-[11px] text-muted-foreground">
        {featured ? "Leading this week" : "Community achiever"}
      </p>
    </div>
  )
}

function MemberMiniRow({
  member,
  rank,
}: {
  member: HighlightMember
  rank: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {rank}
      </div>

      <Avatar className="size-7">
        {member.avatar_url ? (
          <AvatarImage src={member.avatar_url} alt={member.full_name} />
        ) : null}
        <AvatarFallback className="text-[10px]">
          {getInitials(member.full_name)}
        </AvatarFallback>
      </Avatar>

      <p className="min-w-0 flex-1 truncate text-sm font-medium">
        {member.full_name}
      </p>

      <Medal className="size-4 text-muted-foreground" />
    </div>
  )
}

export function CommunityHighlights({ highlights }: Props) {
  const hasAny =
    highlights.most_helpful.length > 0 ||
    highlights.top_responders.length > 0 ||
    highlights.rising_star

  if (!hasAny) return null

  const mostHelpful = highlights.most_helpful[0]
  const topResponder = highlights.top_responders[0]
  const risingStar = highlights.rising_star

  const podiumItems = [
    mostHelpful
      ? {
          member: mostHelpful,
          label: "Most Helpful",
          icon: <Heart className="size-3 fill-current" />,
          rank: 1,
          featured: true,
        }
      : null,
    topResponder
      ? {
          member: topResponder,
          label: "Top Responder",
          icon: <MessageSquare className="size-3" />,
          rank: 2,
          featured: false,
        }
      : null,
    risingStar
      ? {
          member: risingStar,
          label: "Rising Star",
          icon: <Sparkles className="size-3 fill-current" />,
          rank: 3,
          featured: false,
        }
      : null,
  ].filter(Boolean) as {
    member: HighlightMember
    label: string
    icon: React.ReactNode
    rank: number
    featured: boolean
  }[]

  const otherMembers = [
    ...highlights.most_helpful.slice(1),
    ...highlights.top_responders.slice(1),
  ].slice(0, 4)

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.04]">
      <CardContent className="p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Trophy className="size-4 text-yellow-500" />
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Weekly Recognition
              </p>
            </div>

            <h2 className="text-lg font-bold">This Week’s Champions</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Members earning visibility through helpful activity.
            </p>
          </div>

          <div className="rounded-full bg-primary/10 p-2">
            <Crown className="size-5 text-primary" />
          </div>
        </div>

        {podiumItems.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {podiumItems.map((item) => (
              <PodiumCard
                key={`${item.label}-${item.member.user_id}`}
                member={item.member}
                label={item.label}
                icon={item.icon}
                rank={item.rank}
                featured={item.featured}
              />
            ))}
          </div>
        )}

        {otherMembers.length > 0 && (
          <div className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="size-4 text-orange-500" />
              <h3 className="text-sm font-semibold">Popular Members</h3>
            </div>

            <div className="space-y-2">
              {otherMembers.map((member, index) => (
                <MemberMiniRow
                  key={`${member.user_id}-${index}`}
                  member={member}
                  rank={index + 4}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}