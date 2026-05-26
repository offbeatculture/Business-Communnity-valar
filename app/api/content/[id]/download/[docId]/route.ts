import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function requiresPremiumAccess(label: string) {
  const normalizedLabel = label.toLowerCase()

  return (
    normalizedLabel.includes("x factor") ||
    normalizedLabel.includes("xfactor") ||
    normalizedLabel.includes("business definition") ||
    normalizedLabel.includes("business defenition")
  )
}

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

    const { data: doc, error: docError } = await supabase
      .from("resource_documents")
      .select("id, file_url, download_count, resource_id, label")
      .eq("id", docId)
      .eq("resource_id", id)
      .single()

    if (docError || !doc || !doc.file_url) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const isPremiumDoc = requiresPremiumAccess(doc.label || "")

    if (isPremiumDoc) {
      const { data: premiumSubscription, error: subError } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("amount_paid", 149900)
        .limit(1)
        .maybeSingle()

      if (subError) {
        console.error("Subscription check error:", subError)
        return NextResponse.json(
          { error: "Unable to verify subscription" },
          { status: 500 }
        )
      }

      if (!premiumSubscription) {
        return NextResponse.json(
          { error: "Upgrade required" },
          { status: 403 }
        )
      }
    }

    const admin = createAdminClient()

    const { data: signed, error: signError } = await admin.storage
      .from("resources")
      .createSignedUrl(doc.file_url, 60)

    if (signError || !signed) {
      console.error("Signed URL error:", signError)
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      )
    }

    const fileResponse = await fetch(signed.signedUrl)

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch file" },
        { status: 500 }
      )
    }

    const ext = doc.file_url.split(".").pop()?.toLowerCase() || "html"

    const contentTypeMap: Record<string, string> = {
      html: "text/html",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
    }

    const contentType = contentTypeMap[ext] || "application/octet-stream"
    const safeLabel = doc.label || "document"
    const filename = `${safeLabel}.${ext}`

    admin
      .from("resource_documents")
      .update({ download_count: (doc.download_count || 0) + 1 })
      .eq("id", docId)
      .then(() => {})

    return new NextResponse(fileResponse.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Download document error:", error)

    return NextResponse.json(
      { error: "Failed to process download" },
      { status: 500 }
    )
  }
}