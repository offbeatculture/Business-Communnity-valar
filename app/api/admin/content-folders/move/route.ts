// Move one or more folders inside another folder, or back to the top level.

import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyContentAdmin } from "@/lib/auth/content-admin"
import { moveFoldersError, type FolderNode } from "@/lib/folder-tree"

const MoveFoldersSchema = z.object({
  folder_ids: z.array(z.string().uuid()).min(1).max(200),
  // null = top level of the library.
  parent_id: z.string().uuid().nullable(),
})

export async function POST(request: Request) {
  try {
    const auth = await verifyContentAdmin()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const parsed = MoveFoldersSchema.safeParse(
      await request.json().catch(() => null)
    )

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { folder_ids, parent_id } = parsed.data
    const admin = createAdminClient()

    // The whole folder list is small, and checking cycles needs all of it.
    const { data: folders, error: loadError } = await admin
      .from("content_folders")
      .select("id, name, parent_id, sort_order, created_at")

    if (loadError) {
      console.error("Load folders for move error:", loadError)
      return NextResponse.json(
        { error: "Failed to move folders" },
        { status: 500 }
      )
    }

    const all = (folders ?? []) as FolderNode[]

    // Readable refusal here; the database trigger refuses too if this is
    // ever bypassed.
    const problem = moveFoldersError(all, folder_ids, parent_id)

    if (problem) {
      return NextResponse.json({ error: problem }, { status: 409 })
    }

    const { data, error } = await admin
      .from("content_folders")
      .update({ parent_id })
      .in("id", folder_ids)
      .select("id")

    if (error) {
      console.error("Move folders error:", error)
      return NextResponse.json(
        { error: "Failed to move folders" },
        { status: 500 }
      )
    }

    return NextResponse.json({ moved: data?.length ?? 0 })
  } catch (error) {
    console.error("POST /api/admin/content-folders/move error:", error)
    return NextResponse.json(
      { error: "Failed to move folders" },
      { status: 500 }
    )
  }
}
