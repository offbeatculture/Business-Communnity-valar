import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, docId } = await params

    const { data: doc } = await supabase
      .from("resource_documents")
      .select("id, file_url, resource_id")
      .eq("id", docId)
      .eq("resource_id", id)
      .single()

    if (!doc || !doc.file_url.endsWith(".html")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: signed, error: signError } = await admin.storage
      .from("resources")
      .createSignedUrl(doc.file_url, 60)

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
    console.error("Render document error:", error)
    return NextResponse.json(
      { error: "Failed to render content" },
      { status: 500 }
    )
  }
}
