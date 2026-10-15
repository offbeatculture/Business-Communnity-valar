// Move one or more recordings into a folder.

import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyContentAdmin } from "@/lib/auth/content-admin"

const MoveVideosSchema = z.object({
  video_ids: z.array(z.string().uuid()).min(1).max(500),
  // Required, not nullable: the library only shows recordings through their
  // folder, so a recording with no folder is invisible to members. Moving
  // "nowhere" would quietly unpublish it.
  folder_id: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const auth = await verifyContentAdmin()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const parsed = MoveVideosSchema.safeParse(
      await request.json().catch(() => null)
    )

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { video_ids, folder_id } = parsed.data
    const admin = createAdminClient()

    const { data: folder } = await admin
      .from("content_folders")
      .select("id, name")
      .eq("id", folder_id)
      .maybeSingle()

    if (!folder) {
      return NextResponse.json(
        { error: "The destination folder no longer exists" },
        { status: 404 }
      )
    }

    const { data, error } = await admin
      .from("video_summaries")
      .update({ folder_id })
      .in("id", video_ids)
      .select("id")

    if (error) {
      console.error("Move videos error:", error)
      return NextResponse.json(
        { error: "Failed to move recordings" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      moved: data?.length ?? 0,
      folder: folder.name,
    })
  } catch (error) {
    console.error("POST /api/admin/content/move error:", error)
    return NextResponse.json(
      { error: "Failed to move recordings" },
      { status: 500 }
    )
  }
}
