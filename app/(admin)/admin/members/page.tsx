import { redirect } from "next/navigation"
import { getConsoleViewer } from "@/lib/auth/console-viewer"
import { loadMemberDirectory } from "@/lib/admin/member-directory"
import { MemberDirectory } from "@/components/admin/MemberDirectory"
import { PageHeader } from "@/components/admin/billing/ui"

export const dynamic = "force-dynamic"

export default async function AdminMembersPage() {
  const viewer = await getConsoleViewer()
  if (!viewer) redirect("/dashboard")

  const rows = await loadMemberDirectory()

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Members"
        description="Everyone in one table. Use the cards and filters to narrow it down, and the ⋯ menu on a row to act on that member."
      />
      <MemberDirectory rows={rows} isAdmin={viewer.isAdmin} />
    </div>
  )
}
