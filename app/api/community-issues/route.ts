import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET_NAME = "community-issue-screenshots"
const MAX_FILES = 3
const MAX_TOTAL_SIZE = 3 * 1024 * 1024

function createTicketId() {
  return `CI-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const name = String(formData.get("name") || "").trim()
    const email = String(formData.get("email") || "").trim().toLowerCase()
    const phone = String(formData.get("phone") || "").trim()
    const message = String(formData.get("message") || "").trim()

    const files = formData
      .getAll("screenshots")
      .filter((file): file is File => file instanceof File && file.size > 0)

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email and issue are required" },
        { status: 400 }
      )
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: "You can upload only up to 3 screenshots" },
        { status: 400 }
      )
    }

    const totalSize = files.reduce((total, file) => total + file.size, 0)

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { error: "Screenshots must be less than 3 MB total" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const ticketId = createTicketId()
    const screenshotUrls: string[] = []

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Only image screenshots are allowed" },
          { status: 400 }
        )
      }

      const extension = file.name.split(".").pop() || "png"
      const filePath = `${ticketId}/${crypto.randomUUID()}.${extension}`

      const arrayBuffer = await file.arrayBuffer()

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error("Screenshot upload error:", uploadError)

        return NextResponse.json(
          { error: `Screenshot upload failed: ${uploadError.message}` },
          { status: 500 }
        )
      }

      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath)

      screenshotUrls.push(data.publicUrl)
    }

    const { data, error } = await supabase
      .from("community_issues")
      .insert({
        ticket_id: ticketId,
        name,
        email,
        phone: phone || null,
        message,
        screenshots: screenshotUrls,
        status: "open",
      })
      .select("*")
      .single()

    if (error) {
      console.error("Community issue DB insert error:", error)

      return NextResponse.json(
        { error: `DB insert failed: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      issue: data,
    })
  } catch (error) {
    console.error("Community issue API error:", error)

    const message =
      error instanceof Error ? error.message : "Something went wrong"

    return NextResponse.json(
      { error: `API failed: ${message}` },
      { status: 500 }
    )
  }
}