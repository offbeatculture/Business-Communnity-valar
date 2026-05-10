// ============================================================
// Admin Events API — single-event update + soft-cancel.
//
// PATCH updates allowed fields on a single live_events row.
// DELETE is a soft-cancel (sets status = 'cancelled') — we never hard-delete
// because invoices, RSVPs, and replays may reference these rows long after
// the event itself is over. (TODO: once a `requireAdmin` helper lands in
// lib/auth, swap the inline check below for that helper.)
// ============================================================
import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// All fields are optional on PATCH. event_type is intentionally omitted —
// it is immutable on edit per the spec (a workshop never becomes an AI Lab
// event or vice versa).
const PatchEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  starts_at: z.string().min(1).optional(),
  duration_minutes: z.number().int().positive().optional(),
  meeting_url: z.string().url().optional().nullable().or(z.literal("")),
  status: z.enum(["scheduled", "live", "completed", "cancelled"]).optional(),
  hot_seat_slots: z.number().int().min(0).optional(),
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = PatchEventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    // Build a targeted update payload — only include fields the caller sent
    // so we never accidentally overwrite a column with `undefined`.
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    const data = parsed.data
    if (data.title !== undefined) update.title = data.title
    if (data.description !== undefined) update.description = data.description
    if (data.starts_at !== undefined) update.starts_at = data.starts_at
    if (data.duration_minutes !== undefined)
      update.duration_minutes = data.duration_minutes
    if (data.meeting_url !== undefined) {
      update.meeting_url =
        data.meeting_url && data.meeting_url.length > 0
          ? data.meeting_url
          : null
    }
    if (data.status !== undefined) update.status = data.status
    if (data.hot_seat_slots !== undefined)
      update.hot_seat_slots = data.hot_seat_slots

    const { data: updated, error } = await admin
      .from("live_events")
      .update(update)
      .eq("id", id)
      .select()
      .single()

    if (error || !updated) {
      console.error("Update event error:", error)
      // PostgREST returns PGRST116 ("Results contain 0 rows") when the id
      // does not exist; surface that as a 404.
      const code = (error as { code?: string } | null)?.code
      if (code === "PGRST116") {
        return NextResponse.json({ error: "Event not found" }, { status: 404 })
      }
      return NextResponse.json(
        { error: "Failed to update event" },
        { status: 500 },
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update event error:", error)
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const admin = createAdminClient()

    // Soft-cancel: set status to 'cancelled' rather than deleting the row.
    // Invoices may eventually reference live_events; a hard delete would
    // break those joins.
    const { data: updated, error } = await admin
      .from("live_events")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error || !updated) {
      console.error("Cancel event error:", error)
      const code = (error as { code?: string } | null)?.code
      if (code === "PGRST116") {
        return NextResponse.json({ error: "Event not found" }, { status: 404 })
      }
      return NextResponse.json(
        { error: "Failed to cancel event" },
        { status: 500 },
      )
    }

    // 204-equivalent semantics, but keep a JSON body so the client can
    // confirm the soft-cancel happened.
    return NextResponse.json({ success: true, event: updated })
  } catch (error) {
    console.error("Cancel event error:", error)
    return NextResponse.json(
      { error: "Failed to cancel event" },
      { status: 500 },
    )
  }
}
