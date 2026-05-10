// ============================================================
// Admin Event Replay API — attach a replay row to an event.
//
// POST creates a `live_event_replays` row tied to the parent event. The
// `event_type` column on the replay is denormalised from the parent so
// downstream tier-gating queries can filter without a join.
//
// (TODO: once a `requireAdmin` helper lands in lib/auth, swap the inline
// check below for that helper.)
// ============================================================
import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const CreateReplaySchema = z.object({
  replay_url: z.string().url(),
  duration_seconds: z.number().int().positive().optional().nullable(),
  transcript_url: z.string().url().optional().nullable().or(z.literal("")),
  // Defaults to "now" on the server if the caller does not specify.
  // We accept ISO-8601 strings (datetime-local inputs supply that shape).
  published_at: z.string().optional().nullable(),
})

async function verifyAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  return profile?.role === "admin" ? user : null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: eventId } = await params
    const body = await request.json()
    const parsed = CreateReplaySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    // Look up the parent event so we can copy event_type into the replay row.
    // This denormalisation matches the schema spec — replays carry their own
    // event_type column to keep tier-gating queries simple.
    const { data: parent, error: parentError } = await admin
      .from("live_events")
      .select("id, event_type")
      .eq("id", eventId)
      .single()

    if (parentError || !parent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const data = parsed.data

    const { data: created, error } = await admin
      .from("live_event_replays")
      .insert({
        event_id: eventId,
        event_type: parent.event_type,
        replay_url: data.replay_url,
        duration_seconds: data.duration_seconds ?? null,
        transcript_url:
          data.transcript_url && data.transcript_url.length > 0
            ? data.transcript_url
            : null,
        published_at: data.published_at ?? new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !created) {
      console.error("Create replay error:", error)
      return NextResponse.json(
        { error: "Failed to create replay" },
        { status: 500 },
      )
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Create replay error:", error)
    return NextResponse.json(
      { error: "Failed to create replay" },
      { status: 500 },
    )
  }
}
