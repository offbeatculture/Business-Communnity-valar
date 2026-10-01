// Upload a cover image for a content folder.
// Mirrors the avatar upload route: multipart form with a single `file` field.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyContentAdmin } from "@/lib/auth/content-admin"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 4 * 1024 * 1024 // 4MB — covers are wider than avatars

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = await verifyContentAdmin()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 4MB" },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Derive the extension from the verified MIME type rather than the
    // user-supplied filename, so a mislabelled upload cannot pick the path.
    const ext = EXTENSION_BY_TYPE[file.type]

    // Timestamped name: the CDN caches by URL, so reusing one path would leave
    // viewers looking at the previous cover.
    const path = `${id}/${Date.now()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from("folder-covers")
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      console.error("Folder cover upload error:", uploadError)
      return NextResponse.json(
        { error: "Failed to upload cover image" },
        { status: 500 }
      )
    }

    const { data: urlData } = admin.storage
      .from("folder-covers")
      .getPublicUrl(path)

    const cover_image_url = urlData.publicUrl

    const { data, error: updateError } = await admin
      .from("content_folders")
      .update({ cover_image_url })
      .eq("id", id)
      .select("id, name, slug, description, cover_image_url, sort_order, created_at")
      .single()

    if (updateError) {
      console.error("Folder cover update error:", updateError)
      return NextResponse.json(
        { error: "Uploaded, but failed to attach the cover to the folder" },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("POST /api/admin/content-folders/[id]/cover error:", error)
    return NextResponse.json(
      { error: "Failed to upload cover image" },
      { status: 500 }
    )
  }
}
