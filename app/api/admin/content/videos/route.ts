// Every recording, for the admin content table.
//
// The table used to load from /api/content — the member-facing list — which
// returns published videos only, 12 per page. So the admin table showed the
// 12 newest published recordings and nothing else: drafts and anything older
// could not be seen, edited or moved from the admin panel at all.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyContentAdmin } from "@/lib/auth/content-admin"

export async function GET() {
  try {
    const auth = await verifyContentAdmin()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const admin = createAdminClient()

    const { data, error } = await admin
      .from("video_summaries")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Fetch admin videos error:", error)
      return NextResponse.json(
        { error: "Failed to load recordings" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: (data ?? []).map((video) => ({
        ...video,
        content_type: "video_summary",
      })),
    })
  } catch (error) {
    console.error("GET /api/admin/content/videos error:", error)
    return NextResponse.json(
      { error: "Failed to load recordings" },
      { status: 500 }
    )
  }
}
