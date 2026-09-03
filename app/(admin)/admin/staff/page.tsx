import Link from "next/link"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getConsoleViewer } from "@/lib/auth/console-viewer"
import { Button } from "@/components/ui/button"
import { ArrowRight, CircleHelp, LifeBuoy, ListChecks, Users } from "lucide-react"

export const metadata = { title: "Support Portal" }

export default async function StaffOverviewPage() {
  const viewer = await getConsoleViewer()
  if (!viewer) redirect("/dashboard")

  const admin = createAdminClient()

  const [openTasks, openSupport, openIssues, memberCount] = await Promise.all([
    admin.from("staff_tasks").select("id", { count: "exact", head: true }).eq("is_completed", false),
    admin.from("support_queries").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("community_issues").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("profiles").select("id", { count: "exact", head: true }),
  ])

  const cards = [
    { label: "Open follow-ups", value: openTasks.count ?? 0, href: "/admin/tasks", icon: ListChecks },
    { label: "Support queries", value: openSupport.count ?? 0, href: "/admin/support", icon: CircleHelp },
    { label: "Community issues", value: openIssues.count ?? 0, href: "/admin/community-issues", icon: LifeBuoy },
    { label: "Members", value: memberCount.count ?? 0, href: "/admin/members", icon: Users },
  ]

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {viewer.isStaff ? "Support Portal" : "Support Overview"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {viewer.fullName ? `${viewer.fullName.split(" ")[0]}, here` : "Here"} is
          what is waiting today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40"
          >
            <c.icon className="mb-2 size-4 text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h2 className="mb-1 text-base font-semibold">Start here</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Work the follow-up list first, then the support queue.
        </p>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/tasks">
            <Button size="sm">
              Follow-ups
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
          <Link href="/admin/support">
            <Button size="sm" variant="outline">
              Support queries
            </Button>
          </Link>
          <Link href="/admin/members">
            <Button size="sm" variant="outline">
              Members
            </Button>
          </Link>
        </div>
      </div>

      {viewer.isStaff && (
        <p className="text-xs text-muted-foreground">
          Revenue figures, member creation and password tools are admin-only
          and are hidden from this portal.
        </p>
      )}
    </div>
  )
}
