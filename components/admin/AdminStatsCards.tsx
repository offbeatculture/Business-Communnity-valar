import { Card, CardContent } from "@/components/ui/card"
import { Users, CreditCard, MessageSquare, UserPlus } from "lucide-react"
import type { AdminStats } from "@/types"

type Props = {
  stats: AdminStats
}

const statConfig = [
  { key: "totalMembers" as const, label: "Total Members", icon: Users },
  { key: "activeSubscriptions" as const, label: "Active Subscriptions", icon: CreditCard },
  { key: "postsThisMonth" as const, label: "Posts This Month", icon: MessageSquare },
  { key: "newMembersThisMonth" as const, label: "New This Month", icon: UserPlus },
]

export function AdminStatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statConfig.map(({ key, label, icon: Icon }) => (
        <Card key={key} className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{stats[key]}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
