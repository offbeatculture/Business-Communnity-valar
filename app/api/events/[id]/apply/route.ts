import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

// POST /api/events/[id]/apply    — submit a hot-seat application
// DELETE /api/events/[id]/apply  — withdraw the user's pending application
//
// RLS + a BEFORE INSERT trigger enforce two rules at the DB layer:
//   1. Workshop-only — trg_hot_seat_workshop_only() raises an exception if
//      event_type != 'workshop'.
//   2. Tier rank — RLS INSERT policy requires current_user_tier_rank()
//      meets the event's min_tier_rank.

const bodySchema = z.object({
  application_text: z
    .string()
    .min(50, "Tell us a bit more — at least 50 characters."),
  numbers_summary: z.string().nullable().optional(),
})

export async function POST(
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
        {
          error:
            parsed.error.issues[0]?.message ?? "Invalid application body",
        },
        { status: 400 },
      )
    }

    const { error } = await supabase.from("hot_seat_applications").insert({
      event_id: id,
      user_id: user.id,
      application_text: parsed.data.application_text,
      numbers_summary: parsed.data.numbers_summary ?? null,
    })

    if (error) {
      // Common reasons: RLS denial (tier), trigger raise (non-workshop event),
      // unique violation (already applied).
      const isUnique = error.code === "23505"
      const isRlsDenial =
        error.code === "42501" || /row-level security/i.test(error.message)
      const isTriggerError = /workshop_only|hot_seat/i.test(error.message)

      console.error("Hot seat insert error:", error)
      if (isUnique) {
        return NextResponse.json(
          { error: "You have already applied for this event." },
          { status: 409 },
        )
      }
      if (isTriggerError) {
        return NextResponse.json(
          {
            error:
              "Hot-seat applications are only allowed for workshop events.",
          },
          { status: 400 },
        )
      }
      if (isRlsDenial) {
        return NextResponse.json(
          {
            error:
              "Your tier does not allow applying for a hot seat. Upgrade to Workshop to apply.",
          },
          { status: 403 },
        )
      }
      return NextResponse.json(
        { error: "Failed to submit application" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Hot seat POST error:", error)
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 },
    )
  }
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

    // Only allowed if the row is still pending — set status='withdrawn'.
    const { data: existing } = await supabase
      .from("hot_seat_applications")
      .select("id, status")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json(
        { error: "No application to withdraw." },
        { status: 404 },
      )
    }
    if (existing.status !== "pending") {
      return NextResponse.json(
        {
          error:
            "Only pending applications can be withdrawn. Yours has already been reviewed.",
        },
        { status: 409 },
      )
    }

    const { error } = await supabase
      .from("hot_seat_applications")
      .update({ status: "withdrawn" })
      .eq("id", existing.id)

    if (error) {
      console.error("Hot seat withdraw error:", error)
      return NextResponse.json(
        { error: "Failed to withdraw application" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Hot seat DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to withdraw application" },
      { status: 500 },
    )
  }
}
