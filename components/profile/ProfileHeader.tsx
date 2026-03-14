import Link from "next/link"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, MapPin, Building2, Calendar } from "lucide-react"
import { LevelBadge } from "@/components/engagement/LevelBadge"
import { StreakIndicator } from "@/components/engagement/StreakIndicator"
import type { ProfileWithSubscription, MemberLevel } from "@/types"

type Props = {
  profile: ProfileWithSubscription
  isOwnProfile: boolean
  memberLevel?: MemberLevel | null
}

export function ProfileHeader({ profile, isOwnProfile, memberLevel }: Props) {
  const initials = (profile.full_name ?? "A")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex flex-col sm:flex-row items-start gap-4">
      <Avatar className="size-20">
        {profile.avatar_url ? (
          <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
        ) : null}
        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 className="text-xl font-bold truncate">{profile.full_name}</h1>
          {memberLevel && (
            <>
              <LevelBadge level={memberLevel.current_level} size="sm" />
              <StreakIndicator streak={memberLevel.current_streak} size="sm" />
            </>
          )}
          {isOwnProfile && (
            <Link href="/profile/edit">
              <Button variant="outline" size="sm">
                <Pencil className="size-3.5 mr-1.5" />
                Edit Profile
              </Button>
            </Link>
          )}
        </div>

        {profile.business_name && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
            <Building2 className="size-3.5" />
            {profile.business_name}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {profile.city && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {profile.city}
            </span>
          )}
          {profile.industry && (
            <Badge variant="outline" className="text-xs">
              {profile.industry}
            </Badge>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            Member since {format(new Date(profile.created_at), "MMM yyyy")}
          </span>
        </div>

        {profile.bio && (
          <p className="text-sm mt-3 text-muted-foreground">{profile.bio}</p>
        )}
      </div>
    </div>
  )
}
