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

    const { data: resource } = await supabase
      .from("resources")
      .select("id, file_url, title")
      .eq("id", id)
      .eq("is_published", true)
      .single()

    if (!resource || !resource.file_url || !resource.file_url.endsWith(".html")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: signed, error: signError } = await admin.storage
      .from("resources")
      .createSignedUrl(resource.file_url, 60)

    if (signError || !signed) {
      console.error("Signed URL error:", signError)
      return NextResponse.json(
        { error: "Failed to load content" },
        { status: 500 }
      )
    }

    const response = await fetch(signed.signedUrl)
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch content" },
        { status: 500 }
      )
    }

    const html = await response.text()

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (error) {
    console.error("Render error:", error)
    return NextResponse.json(
      { error: "Failed to render content" },
      { status: 500 }
    )
  }
}
