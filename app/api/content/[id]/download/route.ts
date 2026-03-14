import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
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

    // Fetch the resource
    const { data: resource } = await supabase
      .from("resources")
      .select("id, file_url, download_count, title")
      .eq("id", id)
      .eq("is_published", true)
      .single()

    if (!resource || !resource.file_url) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Create a signed URL for the file (valid for 60 seconds)
    const admin = createAdminClient()
    const { data: signed, error: signError } = await admin.storage
      .from("resources")
      .createSignedUrl(resource.file_url, 60)

    if (signError || !signed) {
      console.error("Signed URL error:", signError)
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      )
    }

    // Fetch the file server-side to proxy with correct headers
    const fileResponse = await fetch(signed.signedUrl)
    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch file" },
        { status: 500 }
      )
    }

    const ext = resource.file_url.split(".").pop()?.toLowerCase() || "html"
    const contentTypeMap: Record<string, string> = {
      html: "text/html",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
    }
    const contentType = contentTypeMap[ext] || "application/octet-stream"
    const filename = `${resource.title || "download"}.${ext}`

    // Increment download count (non-blocking)
    admin
      .from("resources")
      .update({ download_count: resource.download_count + 1 })
      .eq("id", id)
      .then(() => {})

    return new NextResponse(fileResponse.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json(
      { error: "Failed to process download" },
      { status: 500 }
    )
  }
}
