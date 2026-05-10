// ============================================================
// Admin Events API — list + create live events.
//
// Phase 4 of the three-tier subscription system. Backed by the
// `live_events` table (see migration 20260510_workshop_and_ai_lab_tables.sql).
//
// Auth model: admin role only. We use the same inline `profiles.role === "admin"`
// check used elsewhere in the admin API surface (see app/api/admin/content/route.ts).
// We deliberately do NOT use `requireTier` here because that helper is for
// member-tier gating; admin gating is role-based, not tier-based. (TODO:
// once a `requireAdmin` helper lands in lib/auth, swap this inline check
// for that helper to keep gating logic in one place.)
// ============================================================
import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const CreateEventSchema = z.object({
  event_type: z.enum(["workshop", "ai_lab"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  starts_at: z.string().min(1, "Start time is required"),
  duration_minutes: z.number().int().positive().default(90),
  meeting_url: z.string().url().optional().nullable().or(z.literal("")),
  status: z
    .enum(["scheduled", "live", "completed", "cancelled"])
    .default("scheduled"),
  hot_seat_slots: z.number().int().min(0).default(3),
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

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const url = new URL(request.url)
    const eventType = url.searchParams.get("type")
    const status = url.searchParams.get("status")

    const admin = createAdminClient()

    let query = admin
      .from("live_events")
      .select(
        "id, event_type, title, description, starts_at, duration_minutes, meeting_url, status, min_tier_rank, hot_seat_slots, created_by, created_at, updated_at",
      )
      .order("starts_at", { ascending: false })

    if (eventType === "workshop" || eventType === "ai_lab") {
      query = query.eq("event_type", eventType)
    }
    if (
      status === "scheduled" ||
      status === "live" ||
      status === "completed" ||
      status === "cancelled"
    ) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("List events error:", error)
      return NextResponse.json(
        { error: "Failed to load events" },
        { status: 500 },
      )
    }

    return NextResponse.json({ events: data ?? [] })
  } catch (error) {
    console.error("List events error:", error)
    return NextResponse.json(
      { error: "Failed to load events" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = CreateEventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const data = parsed.data

    // min_tier_rank derives from event_type:
    //   workshop -> rank 2 (Workshop tier minimum for live access)
    //   ai_lab   -> rank 3 (AI Lab only)
    // We set it here explicitly so the row reads correctly without relying on
    // a DB default; the DB still has its own CHECK constraint enforcing it.
    const minTierRank = data.event_type === "workshop" ? 2 : 3

    // ai_lab events do not have hot seats per the access matrix. Force 0 to
    // keep the data clean regardless of what the form posts.
    const hotSeatSlots =
      data.event_type === "workshop" ? data.hot_seat_slots : 0

    const admin = createAdminClient()

    const { data: created, error } = await admin
      .from("live_events")
      .insert({
        event_type: data.event_type,
        title: data.title,
        description: data.description ?? null,
        starts_at: data.starts_at,
        duration_minutes: data.duration_minutes,
        meeting_url:
          data.meeting_url && data.meeting_url.length > 0
            ? data.meeting_url
            : null,
        status: data.status,
        min_tier_rank: minTierRank,
        hot_seat_slots: hotSeatSlots,
        created_by: user.id,
      })
      .select()
      .single()

    if (error || !created) {
      console.error("Create event error:", error)
      return NextResponse.json(
        { error: "Failed to create event" },
        { status: 500 },
      )
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Create event error:", error)
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    )
  }
}
