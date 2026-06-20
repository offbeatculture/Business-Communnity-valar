import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  Lightbulb,
  MessageSquare,
  Users,
} from "lucide-react"
import { AdminStatsCards } from "@/components/admin/AdminStatsCards"
import { fetchAdminStats } from "@/lib/profile"

export default async function AdminPage() {
  const stats = await fetchAdminStats()

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-teal-300">
          Daily Breathwork Admin
        </p>

        <h1 className="mb-1 text-2xl font-bold">Admin Panel</h1>

        <p className="text-sm text-muted-foreground">
          Manage Valarmathi community content, members, sessions, and practice resources.
        </p>
      </div>

      <AdminStatsCards stats={stats} />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/content">
          <Card className="h-full cursor-pointer border-teal-500/20 transition-colors hover:border-teal-400/50 hover:bg-teal-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-5 text-teal-300" />
                Breathwork Library
              </CardTitle>
              <CardDescription>
                Create and manage practice guides, worksheets, session videos, and resources.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/community">
          <Card className="h-full cursor-pointer border-teal-500/20 transition-colors hover:border-teal-400/50 hover:bg-teal-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5 text-teal-300" />
                Community Moderation
              </CardTitle>
              <CardDescription>
                Pin reflections, remove content, and manage member discussions.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/members">
          <Card className="h-full cursor-pointer border-teal-500/20 transition-colors hover:border-teal-400/50 hover:bg-teal-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-teal-300" />
                Members
              </CardTitle>
              <CardDescription>
                View members, manage subscriptions, and moderate accounts.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/prompts">
          <Card className="h-full cursor-pointer border-teal-500/20 transition-colors hover:border-teal-400/50 hover:bg-teal-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-5 text-teal-300" />
                Daily Practice Prompts
              </CardTitle>
              <CardDescription>
                Create and schedule daily breathwork prompts for member engagement.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/events">
          <Card className="h-full cursor-pointer border-teal-500/20 transition-colors hover:border-teal-400/50 hover:bg-teal-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5 text-teal-300" />
                Live Sessions
              </CardTitle>
              <CardDescription>
                Schedule breathwork sessions, workshops, and manage replays.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/assessment-reports">
          <Card className="h-full cursor-pointer border-teal-500/20 transition-colors hover:border-teal-400/50 hover:bg-teal-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="size-5 text-teal-300" />
                Wellbeing Reports
              </CardTitle>
              <CardDescription>
                Review and approve assessment reports before they reach members.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}