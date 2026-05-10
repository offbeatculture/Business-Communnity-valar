import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

// POST /api/events/[id]/rsvp     — upsert (insert or update) the user's RSVP
// PATCH /api/events/[id]/rsvp    — alias of POST
// DELETE /api/events/[id]/rsvp   — remove the user's RSVP
//
// RLS on live_event_rsvps enforces tier-rank gating; we trust it. The Phase 4
// migration's INSERT policy checks current_user_tier_rank() >= the parent
// event's min_tier_rank, so a Library member trying to RSVP for a Workshop
// event will get a row-level violation back from PostgREST.

const bodySchema = z.object({
  rsvp_status: z.enum(["yes", "maybe", "no"]),
})

async function upsertRsvp(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid RSVP status" },
        { status: 400 },
      )
    }

    // Upsert via the (event_id, user_id) unique constraint.
    const { error } = await supabase
      .from("live_event_rsvps")
      .upsert(
        {
          event_id: id,
          user_id: user.id,
          rsvp_status: parsed.data.rsvp_status,
        },
        { onConflict: "event_id,user_id" },
      )

    if (error) {
      // RLS denial → 403 with the real Postgres message stripped.
      const isRlsDenial =
        error.code === "42501" || /row-level security/i.test(error.message)
      console.error("RSVP upsert error:", error)
      return NextResponse.json(
        {
          error: isRlsDenial
            ? "Your tier does not allow RSVPing to this event."
            : "Failed to save RSVP",
        },
        { status: isRlsDenial ? 403 : 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("RSVP route error:", error)
    return NextResponse.json(
      { error: "Failed to save RSVP" },
      { status: 500 },
    )
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return upsertRsvp(request, ctx)
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return upsertRsvp(request, ctx)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("live_event_rsvps")
      .delete()
      .eq("event_id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("RSVP delete error:", error)
      return NextResponse.json(
        { error: "Failed to clear RSVP" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("RSVP delete route error:", error)
    return NextResponse.json(
      { error: "Failed to clear RSVP" },
      { status: 500 },
    )
  }
}
