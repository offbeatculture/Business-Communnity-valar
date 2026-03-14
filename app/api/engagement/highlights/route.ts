import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchWeeklyHighlights } from "@/lib/engagement"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const highlights = await fetchWeeklyHighlights()
    return NextResponse.json(highlights)
  } catch (error) {
    console.error("GET /api/engagement/highlights error:", error)
    return NextResponse.json(
      { error: "Failed to fetch highlights" },
      { status: 500 }
    )
  }
}
