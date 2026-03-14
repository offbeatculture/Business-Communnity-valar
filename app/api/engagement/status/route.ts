import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchMemberLevel } from "@/lib/engagement"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const memberLevel = await fetchMemberLevel(user.id)
    return NextResponse.json(memberLevel)
  } catch (error) {
    console.error("GET /api/engagement/status error:", error)
    return NextResponse.json(
      { error: "Failed to fetch engagement status" },
      { status: 500 }
    )
  }
}
