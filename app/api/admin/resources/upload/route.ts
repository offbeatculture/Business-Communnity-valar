// Upload a downloadable resource file and get back its storage path.
//
// The older /api/admin/content/upload is admin-only and accepts PDF and HTML
// alone. Recording admins also attach handouts to sessions, and those handouts
// are not always PDFs, so this route widens both.
//
// Files go to the private `resources` bucket. The returned value is an object
// path, not a URL — downloads are served through the API so membership can be
// checked first.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyContentAdmin } from "@/lib/auth/content-admin"

const MAX_SIZE = 25 * 1024 * 1024 // 25MB

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/html",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
])

export async function POST(request: Request) {
  try {
    const auth = await verifyContentAdmin()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Allowed: PDF, HTML, text, CSV, Word, Excel, PowerPoint, ZIP and images.",
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 25MB" },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Keep the original name for a recognisable download, but strip anything
    // that could alter the storage path. The timestamp avoids collisions.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100)
    const path = `video-resources/${Date.now()}-${safeName}`

    const { error: uploadError } = await admin.storage
      .from("resources")
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error("Resource upload error:", uploadError)

      // This route is admin-only, and a generic message here just means the
      // admin has to come and ask what went wrong. Pass the storage error
      // through — "Bucket not found" or "mime type not supported" tells them
      // exactly what to fix.
      return NextResponse.json(
        { error: `Storage rejected the file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ path, name: file.name })
  } catch (error) {
    console.error("POST /api/admin/resources/upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload the file" },
      { status: 500 }
    )
  }
}
