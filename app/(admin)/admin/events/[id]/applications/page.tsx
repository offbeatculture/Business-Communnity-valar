// ============================================================
// Admin — Hot-seat applications review page.
//
// Server component. Lists every hot_seat_applications row for the given
// event, joined to the applicant's profile so we can show their name.
// Per-row Select / Reject is a small client island
// (HotSeatApplicationActions).
// ============================================================
import Link from "next/link"
import { format } from "date-fns"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft } from "lucide-react"
import { HotSeatApplicationActions } from "@/components/admin/HotSeatApplicationActions"

type LiveEventRow = {
  id: string
  event_type: "workshop" | "ai_lab"
  title: string
  starts_at: string
  hot_seat_slots: number
}

type ApplicationRow = {
  id: string
  user_id: string
  application_text: string
  numbers_summary: string | null
  status: "pending" | "selected" | "rejected" | "withdrawn"
  created_at: string
  reviewed_at: string | null
}

type ProfileLite = {
  user_id: string
  full_name: string | null
}

const STATUS_BADGE: Record<ApplicationRow["status"], string> = {
  pending: "bg-blue-500/10 text-blue-500",
  selected: "bg-green-500/10 text-green-500",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
}

export default async function HotSeatApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
  if (profile?.role !== "admin") redirect("/dashboard")

  const { id } = await params
  const admin = createAdminClient()

  const { data: rawEvent } = await admin
    .from("live_events")
    .select("id, event_type, title, starts_at, hot_seat_slots")
    .eq("id", id)
    .single()
  if (!rawEvent) notFound()
  const event = rawEvent as unknown as LiveEventRow

  // Newest applications first so the most recent ones are easy to act on.
  const { data: rawApps } = await admin
    .from("hot_seat_applications")
    .select(
      "id, user_id, application_text, numbers_summary, status, created_at, reviewed_at",
    )
    .eq("event_id", id)
    .order("created_at", { ascending: false })

  const applications = (rawApps ?? []) as unknown as ApplicationRow[]

  // Resolve display names in one query rather than N joins. profiles is a
  // small table relative to the application count and the user_id list is
  // bounded by hot_seat_slots applicants.
  const userIds = Array.from(new Set(applications.map((a) => a.user_id)))
  let profileMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profileRows } = await admin
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds)
    const rows = (profileRows ?? []) as ProfileLite[]
    profileMap = new Map(
      rows.map((p) => [p.user_id, p.full_name ?? "Unknown member"]),
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link href={`/admin/events/${event.id}`}>
            <ChevronLeft className="size-4 mr-1" />
            Back to event
          </Link>
        </Button>

        <h1 className="text-2xl font-bold mb-1">Hot-seat applications</h1>
        <p className="text-muted-foreground text-sm">
          {event.title} ·{" "}
          {format(new Date(event.starts_at), "d MMM yyyy, h:mm a")} ·{" "}
          {event.hot_seat_slots} slot
          {event.hot_seat_slots === 1 ? "" : "s"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Applications ({applications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No hot-seat applications yet.
            </p>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {profileMap.get(app.user_id) ?? "Unknown member"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted{" "}
                        {format(
                          new Date(app.created_at),
                          "d MMM yyyy, h:mm a",
                        )}
                        {app.reviewed_at &&
                          ` · reviewed ${format(
                            new Date(app.reviewed_at),
                            "d MMM h:mm a",
                          )}`}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={STATUS_BADGE[app.status] + " capitalize"}
                    >
                      {app.status}
                    </Badge>
                  </div>

                  <p className="text-sm whitespace-pre-line">
                    {app.application_text}
                  </p>

                  {app.numbers_summary && (
                    <div className="rounded-md bg-muted/40 p-3 text-xs">
                      <p className="font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        Numbers summary
                      </p>
                      <p className="whitespace-pre-line">
                        {app.numbers_summary}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <HotSeatApplicationActions
                      eventId={event.id}
                      applicationId={app.id}
                      currentStatus={app.status}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
