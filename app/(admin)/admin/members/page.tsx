import { fetchAllMembers } from "@/lib/profile"
import { MemberTable } from "@/components/admin/MemberTable"

export default async function AdminMembersPage() {
  const { members, hasMore } = await fetchAllMembers({ page: 1, perPage: 20 })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Members</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Manage community members, subscriptions, and accounts.
      </p>

      <MemberTable initialMembers={members} initialHasMore={hasMore} />
    </div>
  )
}
