import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookOpen, Calendar, Lightbulb, MessageSquare, Users } from "lucide-react"
import { AdminStatsCards } from "@/components/admin/AdminStatsCards"
import { fetchAdminStats } from "@/lib/profile"

export default async function AdminPage() {
  const stats = await fetchAdminStats()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Admin Panel</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Manage your community content and settings.
      </p>

      <AdminStatsCards stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Link href="/admin/content">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-5 text-primary" />
                Content Library
              </CardTitle>
              <CardDescription>
                Create and manage cheat sheets, templates, and AI video summaries.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/community">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" />
                Community Moderation
              </CardTitle>
              <CardDescription>
                Pin posts, remove content, and manage discussions.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/members">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                Members
              </CardTitle>
              <CardDescription>
                View members, manage subscriptions, and moderate accounts.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/prompts">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-5 text-primary" />
                Daily Prompts
              </CardTitle>
              <CardDescription>
                Create and schedule daily prompts for member engagement.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/events">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                Live Events
              </CardTitle>
              <CardDescription>
                Schedule workshops, AI Lab sessions, and manage replays.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
