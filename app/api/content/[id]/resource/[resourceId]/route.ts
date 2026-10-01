// Download a resource attached to a recording.
//
// The file lives in the private `resources` bucket, so it is never reachable by
// URL. This route checks the member is signed in, signs a short-lived URL, and
// streams the bytes back with a sensible filename.

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  html: "text/html",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, resourceId } = await params

    // Scoped to the recording in the URL, so a resource id cannot be used to
    // pull a file that belongs to a different session.
    const { data: resource, error } = await supabase
      .from("video_resources")
      .select("id, label, file_url, download_count")
      .eq("id", resourceId)
      .eq("video_id", id)
      .single()

    if (error || !resource?.file_url) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const admin = createAdminClient()

    const { data: signed, error: signError } = await admin.storage
      .from("resources")
      .createSignedUrl(resource.file_url, 60)

    if (signError || !signed) {
      console.error("Resource signed URL error:", signError)
      return NextResponse.json(
        { error: "Failed to generate the download" },
        { status: 500 }
      )
    }

    const fileResponse = await fetch(signed.signedUrl)

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch the file" },
        { status: 500 }
      )
    }

    const storedName = resource.file_url.split("/").pop() ?? "download"
    const ext = storedName.split(".").pop()?.toLowerCase() ?? ""
    const contentType =
      CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream"

    // Name the download after the label the admin gave it, keeping the real
    // extension so it opens in the right application.
    const safeLabel =
      resource.label.replace(/[^a-zA-Z0-9 ._-]/g, "").trim() || "download"
    const filename = ext ? `${safeLabel}.${ext}` : safeLabel

    // Best effort — a failed counter must not block the download.
    void admin
      .from("video_resources")
      .update({ download_count: (resource.download_count ?? 0) + 1 })
      .eq("id", resource.id)
      .then(undefined, () => {})

    return new NextResponse(fileResponse.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("GET /api/content/[id]/resource/[resourceId] error:", error)
    return NextResponse.json(
      { error: "Failed to download the file" },
      { status: 500 }
    )
  }
}
