import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { awardPoints } from "@/lib/engagement"
import { GP_VALUES } from "@/lib/engagement-constants"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const admin = createAdminClient()

    // Try resources first
    const { data: resource } = await admin
      .from("resources")
      .select("id, view_count")
      .eq("id", id)
      .single()

    if (resource) {
      await admin
        .from("resources")
        .update({ view_count: resource.view_count + 1 })
        .eq("id", id)

      // Award GP for content view
      awardPoints(user.id, "content_view", GP_VALUES.content_view, id).catch(() => {})

      return NextResponse.json({ success: true })
    }

    // Try video_summaries
    const { data: video } = await admin
      .from("video_summaries")
      .select("id, view_count")
      .eq("id", id)
      .single()

    if (video) {
      await admin
        .from("video_summaries")
        .update({ view_count: video.view_count + 1 })
        .eq("id", id)

      // Award GP for content view
      awardPoints(user.id, "content_view", GP_VALUES.content_view, id).catch(() => {})

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) {
    console.error("View count error:", error)
    return NextResponse.json(
      { error: "Failed to update view count" },
      { status: 500 }
    )
  }
}
