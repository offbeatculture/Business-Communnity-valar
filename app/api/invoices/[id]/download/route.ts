import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: invoice } = await adminClient
      .from("invoices")
      .select("pdf_url, user_id")
      .eq("id", id)
      .single()

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (invoice.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: signedUrl, error } = await adminClient.storage
      .from("invoices")
      .createSignedUrl(invoice.pdf_url, 60)

    if (error || !signedUrl?.signedUrl) {
      return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 })
    }

    return NextResponse.redirect(signedUrl.signedUrl)
  } catch (error) {
    console.error("Invoice download error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
