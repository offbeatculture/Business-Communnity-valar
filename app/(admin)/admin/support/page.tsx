import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CircleHelp } from "lucide-react"
import { SupportReplyForm } from "@/components/support/SupportReplyForm"

type SupportQuery = {
  id: string
  user_id: string
  category: string
  message: string | null
  status: string
  admin_reply: string | null
  created_at: string
  user_name: string
  user_email: string
}

function formatCategory(category: string) {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function statusClass(status: string) {
  if (status === "closed") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
  }

  if (status === "in_progress") {
    return "border-teal-500/20 bg-teal-500/10 text-teal-300"
  }

  return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
}

export default async function AdminSupportPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  const admin = createAdminClient()

  const { data: queries, error } = await admin
    .from("support_queries")
    .select("id, user_id, category, message, status, admin_reply, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Admin support queries error:", error)
  }

  const userIds = Array.from(new Set((queries ?? []).map((q) => q.user_id)))

  const { data: profiles } =
    userIds.length > 0
      ? await admin
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds)
      : { data: [] }

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, p.full_name ?? "Unknown user"])
  )

  const {
    data: { users },
  } =
    userIds.length > 0
      ? await admin.auth.admin.listUsers()
      : { data: { users: [] } }

  const emailMap = new Map(users.map((u) => [u.id, u.email ?? ""]))

  const enrichedQueries: SupportQuery[] = (queries ?? []).map((query) => ({
    ...query,
    user_name: profileMap.get(query.user_id) ?? "Unknown user",
    user_email: emailMap.get(query.user_id) ?? "",
  }))

  return (
    <div className="mx-auto w-full max-w-7xl pb-10">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/5 px-3 py-1 text-xs font-medium text-teal-300">
          <CircleHelp className="size-3.5" />
          Daily Breathwork Support
        </div>

        <h1 className="text-2xl font-bold tracking-tight">Support Queries</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          View member queries and respond from one place.
        </p>
      </div>

      {enrichedQueries.length === 0 ? (
        <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-3xl border border-dashed border-teal-500/25 bg-card/40 px-6 py-12 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-teal-500/10">
            <CircleHelp className="size-8 text-teal-300" />
          </div>

          <h3 className="text-lg font-semibold">No support queries yet</h3>

          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Member queries will appear here once submitted.
          </p>
        </div>
      ) : (
        <Card className="overflow-hidden border-teal-500/20 shadow-sm shadow-teal-500/5">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="border-b border-teal-500/20 bg-teal-500/5">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Query</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Response</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-teal-500/15">
                  {enrichedQueries.map((query) => (
                    <tr
                      key={query.id}
                      className="align-top transition-colors hover:bg-teal-500/5"
                    >
                      <td className="px-4 py-4 font-medium">
                        {query.user_name}
                      </td>

                      <td className="px-4 py-4 text-muted-foreground">
                        {query.user_email || "No email"}
                      </td>

                      <td className="px-4 py-4">
                        <Badge
                          variant="outline"
                          className="rounded-full border-teal-500/20 bg-teal-500/10 text-teal-300"
                        >
                          {formatCategory(query.category)}
                        </Badge>
                      </td>

                      <td className="max-w-[320px] px-4 py-4">
                        <p className="whitespace-pre-wrap leading-6 text-muted-foreground">
                          {query.message || "No message provided."}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <Badge
                          variant="outline"
                          className={`rounded-full ${statusClass(query.status)}`}
                        >
                          {query.status.replaceAll("_", " ")}
                        </Badge>
                      </td>

                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {new Date(query.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="px-4 py-4">
                        <SupportReplyForm
                          queryId={query.id}
                          existingReply={query.admin_reply}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}