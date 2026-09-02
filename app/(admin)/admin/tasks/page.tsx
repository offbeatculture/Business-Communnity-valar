import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getConsoleViewer } from "@/lib/auth/console-viewer"
import { StaffTasksClient } from "@/components/admin/StaffTasksClient"

export const metadata = { title: "Follow-ups" }

export default async function StaffTasksPage() {
  const viewer = await getConsoleViewer()
  if (!viewer) redirect("/dashboard")

  const admin = createAdminClient()

  const [openRes, doneRes, profilesRes] = await Promise.all([
    admin.from("staff_tasks").select("*").eq("is_completed", false)
      .order("created_at", { ascending: false }).limit(200),
    admin.from("staff_tasks").select("*").eq("is_completed", true)
      .order("completed_at", { ascending: false }).limit(50),
    admin.from("profiles").select("user_id, full_name"),
  ])

  const names = new Map<string, string>()
  for (const p of profilesRes.data ?? []) {
    if (p.user_id) names.set(p.user_id as string, (p.full_name as string) || "Member")
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Follow-ups</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Members who need chasing. Tick one off when it is handled.
        </p>
      </div>

      <StaffTasksClient
        open={openRes.data ?? []}
        done={doneRes.data ?? []}
        names={Object.fromEntries(names)}
      />
    </div>
  )
}
