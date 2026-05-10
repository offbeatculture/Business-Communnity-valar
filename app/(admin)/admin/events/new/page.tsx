// ============================================================
// Admin — Schedule a new live event.
//
// Reads ?type=workshop|ai_lab from the URL so the "Schedule Workshop" /
// "Schedule AI Lab event" CTAs on the list page can pre-select the type.
// ============================================================
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { EventForm, type EventFormValues } from "@/components/admin/EventForm"

// Default the start time input to "now + 7 days, 7:30 PM IST" so the admin
// only has to nudge the date if they want to. Returned as the
// datetime-local-friendly string (no timezone, no seconds).
function defaultStartsAt(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setHours(19, 30, 0, 0)
  // Convert to local-time YYYY-MM-DDTHH:mm without timezone info.
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  )
}

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
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

  const { type: rawType } = await searchParams
  const eventType: "workshop" | "ai_lab" =
    rawType === "ai_lab" ? "ai_lab" : "workshop"

  const initial: EventFormValues = {
    event_type: eventType,
    title: "",
    description: "",
    starts_at: defaultStartsAt(),
    duration_minutes: 90,
    meeting_url: "",
    status: "scheduled",
    hot_seat_slots: 3,
  }

  return (
    <div className="max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/admin/events">
          <ChevronLeft className="size-4 mr-1" />
          Back to events
        </Link>
      </Button>

      <h1 className="text-2xl font-bold mb-1">
        Schedule {eventType === "workshop" ? "a workshop" : "an AI Lab event"}
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Members on Workshop tier and above can RSVP and attend live.{" "}
        {eventType === "ai_lab"
          ? "AI Lab events and replays are exclusive to AI Lab tier."
          : "Replays unlock for Library after 30 days."}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Event details</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm mode="create" initial={initial} />
        </CardContent>
      </Card>
    </div>
  )
}
