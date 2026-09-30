// Upload a cover image and get back its public URL.
//
// Deliberately not tied to a row: the single-video form needs a cover before
// the recording exists, so the caller uploads first and then saves the URL
// with the rest of the form.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyContentAdmin } from "@/lib/auth/content-admin"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 4 * 1024 * 1024 // 4MB

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

const BUCKETS = {
  video: "video-covers",
  folder: "folder-covers",
} as const

type BucketKey = keyof typeof BUCKETS

export async function POST(request: Request) {
  try {
    const auth = await verifyContentAdmin()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const kindValue = String(formData.get("kind") ?? "video")

    if (!(kindValue in BUCKETS)) {
      return NextResponse.json(
        { error: "Unknown cover kind" },
        { status: 400 }
      )
    }

    const bucket = BUCKETS[kindValue as BucketKey]

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

    // Extension comes from the verified MIME type, not the supplied filename,
    // so a mislabelled upload cannot choose its own path.
    const ext = EXTENSION_BY_TYPE[file.type]

    // Random, timestamped name. Covers are cached by URL, so reusing a path
    // would leave viewers looking at the previous image.
    const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(path, file, { upsert: false, contentType: file.type })

    if (uploadError) {
      console.error("Cover upload error:", uploadError)
      return NextResponse.json(
        { error: "Failed to upload the cover image" },
        { status: 500 }
      )
    }

    const { data } = admin.storage.from(bucket).getPublicUrl(path)

    return NextResponse.json({ url: data.publicUrl })
  } catch (error) {
    console.error("POST /api/admin/covers error:", error)
    return NextResponse.json(
      { error: "Failed to upload the cover image" },
      { status: 500 }
    )
  }
}
