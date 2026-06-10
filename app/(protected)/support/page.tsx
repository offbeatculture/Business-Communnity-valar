import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CircleHelp, Clock, MessageSquareReply } from "lucide-react"

type SupportQuery = {
  id: string
  category: string
  message: string | null
  status: string
  admin_reply: string | null
  created_at: string
  updated_at: string
}

function formatCategory(category: string) {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function statusClass(status: string) {
  if (status === "closed") {
    return "border-green-500/20 bg-green-500/10 text-green-500"
  }

  if (status === "in_progress") {
    return "border-yellow-500/20 bg-yellow-500/10 text-yellow-600"
  }

  return "border-primary/20 bg-primary/10 text-primary"
}

export default async function SupportPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: queries, error } = await supabase
    .from("support_queries")
    .select("id, category, message, status, admin_reply, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Support page query error:", error)
  }

  const supportQueries = (queries ?? []) as SupportQuery[]

  return (
    <div className="mx-auto w-full max-w-4xl pb-24 sm:pb-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <CircleHelp className="size-3.5" />
          Support
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          My Support Queries
        </h1>

        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Track your submitted queries and replies from the team.
        </p>
      </div>

      {supportQueries.length === 0 ? (
        <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-12 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
            <CircleHelp className="size-8 text-muted-foreground" />
          </div>

          <h3 className="text-lg font-semibold">No support queries yet</h3>

          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Use the support icon in the top bar to ask a query. Replies from our
            team will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {supportQueries.map((query) => (
            <Card key={query.id} className="border-border/70">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-full border-primary/20 bg-primary/10 text-primary"
                      >
                        {formatCategory(query.category)}
                      </Badge>

                      <Badge
                        variant="outline"
                        className={`rounded-full ${statusClass(query.status)}`}
                      >
                        {query.status.replaceAll("_", " ")}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      Submitted{" "}
                      {new Date(query.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Your Query
                  </p>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {query.message || "No message provided."}
                  </p>
                </div>

                {query.admin_reply ? (
                  <div className="mt-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <MessageSquareReply className="size-4 text-green-500" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                        Team Reply
                      </p>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {query.admin_reply}
                    </p>

                    <p className="mt-3 text-xs text-muted-foreground">
                      Updated{" "}
                      {new Date(query.updated_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-border/60 bg-card p-4">
                    <p className="text-sm font-medium">Waiting for reply</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Our team will look into this and get back to you quickly.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}