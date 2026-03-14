import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { recordVisit } from "@/lib/engagement"

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await recordVisit(user.id)

    // Also fetch current level for level-up detection on client
    const { data: memberLevel } = await supabase
      .from("member_levels")
      .select("current_level")
      .eq("user_id", user.id)
      .maybeSingle()

    return NextResponse.json({
      ...result,
      current_level: memberLevel?.current_level ?? 1,
    })
  } catch (error) {
    console.error("POST /api/engagement/visit error:", error)
    return NextResponse.json(
      { error: "Failed to record visit" },
      { status: 500 }
    )
  }
}
