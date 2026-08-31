import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { awardPoints } from "@/lib/engagement"
import { CHAKRA_KEYS } from "@/lib/mano-mitra"

const GP_MANO_MITRA_SESSION = 8

const sessionSchema = z.object({
  safety_outcome: z.enum(["cleared", "stopped", "migraine_flagged"]),
  emotion_id: z.string().max(40).nullable(),
  chakra: z.enum(CHAKRA_KEYS).nullable(),
  body_zone: z.string().max(40).nullable(),
  sensation: z.string().max(60).nullable(),
  intensity_before: z.number().int().min(0).max(10).nullable(),
  trigger_context: z.string().max(60).nullable(),
  need: z.string().max(60).nullable(),
  activity_id: z.string().max(60).nullable(),
  breath_id: z.string().max(60).nullable(),
  intensity_after: z.number().int().min(0).max(10).nullable(),
  post_feeling: z.string().max(40).nullable(),
  next_action: z.string().max(200).nullable(),
  completed: z.boolean(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parsed = sessionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const { completed, ...fields } = parsed.data
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("mano_mitra_sessions")
      .insert({
        user_id: user.id,
        ...fields,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .select("id")
      .single()

    if (error) {
      console.error("Save mano mitra session error:", error)
      return NextResponse.json({ error: "Failed to save session" }, { status: 500 })
    }

    // Points only for a completed practice. A session that stops at the
    // safety gate is still recorded -- it is exactly the signal Dr Valar
    // needs -- but scoring someone for reporting a crisis would be grim.
    if (completed && fields.safety_outcome === "cleared") {
      await awardPoints(user.id, "mano_mitra_session", GP_MANO_MITRA_SESSION, data.id)
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (error) {
    console.error("POST /api/mano-mitra error:", error)
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 })
  }
}
