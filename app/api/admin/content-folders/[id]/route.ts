// Edit or delete a single content folder.
// Used by the folder manager in the admin content page.

import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyContentAdmin } from "@/lib/auth/content-admin"

const UpdateFolderSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    // An empty string clears the cover; a URL sets it.
    cover_image_url: z.union([z.string().url(), z.literal("")]).nullable().optional(),
    // Lower sorts first in the library; negative pins above everything else.
    sort_order: z.number().int().min(-999).max(999).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to update",
  })

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await verifyContentAdmin()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = UpdateFolderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const updates: Record<string, string | number | null> = {}

    if (parsed.data.sort_order !== undefined) {
      updates.sort_order = parsed.data.sort_order
    }

    if (parsed.data.name !== undefined) {
      updates.name = parsed.data.name.trim()
    }

    if (parsed.data.description !== undefined) {
      updates.description = parsed.data.description?.trim() || null
    }

    if (parsed.data.cover_image_url !== undefined) {
      updates.cover_image_url = parsed.data.cover_image_url || null
    }

    const admin = createAdminClient()

    const { data, error } = await admin
      .from("content_folders")
      .update(updates)
      .eq("id", id)
      .select("id, name, slug, description, cover_image_url, sort_order, created_at")
      .single()

    if (error) {
      console.error("Update folder error:", error)
      return NextResponse.json(
        { error: "Failed to update folder" },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("PATCH /api/admin/content-folders/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update folder" },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await verifyContentAdmin()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const admin = createAdminClient()

    // Refuse to delete a folder that still holds recordings. Deleting it would
    // orphan them from the library with no way to find them again.
    const { count } = await admin
      .from("video_summaries")
      .select("id", { count: "exact", head: true })
      .eq("folder_id", id)

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `This folder still has ${count} recording${
            count === 1 ? "" : "s"
          }. Move or delete them first.`,
        },
        { status: 409 }
      )
    }

    const { error } = await admin
      .from("content_folders")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Delete folder error:", error)
      return NextResponse.json(
        { error: "Failed to delete folder" },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/admin/content-folders/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to delete folder" },
      { status: 500 }
    )
  }
}
