// List the resources attached to a recording, for the admin edit dialog.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyContentAdmin } from "@/lib/auth/content-admin"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyContentAdmin()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("video_resources")
      .select("id, label, file_url, sort_order, download_count, created_at")
      .eq("video_id", id)
      .order("sort_order", { ascending: true })

    if (error) {
      console.error("Fetch video resources error:", error)
      return NextResponse.json(
        { error: "Failed to load resources" },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    console.error("GET /api/admin/content/[id]/resources error:", error)
    return NextResponse.json(
      { error: "Failed to load resources" },
      { status: 500 }
    )
  }
}
