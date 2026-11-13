import { redirect } from "next/navigation"
import { getConsoleViewer } from "@/lib/auth/console-viewer"
import { loadMemberDirectory } from "@/lib/admin/member-directory"
import { MemberDirectory, type Filters } from "@/components/admin/MemberDirectory"
import { PageHeader } from "@/components/admin/billing/ui"

export const dynamic = "force-dynamic"

const STATUSES = ["all", "active", "expiring", "expired", "none"] as const
const LOGINS = ["all", "never", "30d", "inactive"] as const

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; login?: string; q?: string }>
}) {
  const sp = await searchParams
  const initial: Partial<Filters> = {}
  if (STATUSES.includes(sp.status as never)) initial.status = sp.status as Filters["status"]
  if (LOGINS.includes(sp.login as never)) initial.login = sp.login as Filters["login"]
  if (sp.q) initial.q = sp.q.slice(0, 100)

  const viewer = await getConsoleViewer()
  if (!viewer) redirect("/dashboard")

  const rows = await loadMemberDirectory()

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Members"
        description="Everyone in one table. Use the cards and filters to narrow it down, and the ⋯ menu on a row to act on that member."
      />
      <MemberDirectory rows={rows} isAdmin={viewer.isAdmin} initial={initial} />
    </div>
  )
}
