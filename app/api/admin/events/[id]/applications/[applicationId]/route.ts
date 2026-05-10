// ============================================================
// Admin Hot-Seat Applications API — review (select / reject) a single
// application on a live event.
//
// PATCH updates `status` to one of selected | rejected | pending | withdrawn,
// stamps `reviewed_at` and `reviewed_by` automatically. (TODO: once a
// `requireAdmin` helper lands in lib/auth, swap the inline check below for it.)
// ============================================================
import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const PatchApplicationSchema = z.object({
  status: z.enum(["pending", "selected", "rejected", "withdrawn"]),
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
  {
    params,
  }: {
    params: Promise<{ id: string; applicationId: string }>
  },
) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: eventId, applicationId } = await params
    const body = await request.json()
    const parsed = PatchApplicationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    // Constrain the update to applications on THIS event id so a hostile
    // caller cannot mutate an unrelated application by guessing IDs.
    const { data: updated, error } = await admin
      .from("hot_seat_applications")
      .update({
        status: parsed.data.status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", applicationId)
      .eq("event_id", eventId)
      .select()
      .single()

    if (error || !updated) {
      console.error("Update application error:", error)
      const code = (error as { code?: string } | null)?.code
      if (code === "PGRST116") {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 },
        )
      }
      return NextResponse.json(
        { error: "Failed to update application" },
        { status: 500 },
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update application error:", error)
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 },
    )
  }
}
