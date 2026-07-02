import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const CreateFolderSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
})

function createSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// This allows both:
// admin = full admin
// recording_admin = restricted admin who can upload recordings
async function verifyFolderAccess() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, error: "Unauthorized", status: 401 }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profile?.role !== "admin" && profile?.role !== "recording_admin") {
    return { user: null, error: "Forbidden", status: 403 }
  }

  return { user, error: null, status: 200 }
}

// Used by upload form to get folder list
export async function GET() {
  try {
    const auth = await verifyFolderAccess()

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const admin = createAdminClient()

    const { data, error } = await admin
      .from("content_folders")
      .select("id, name, slug, description, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Fetch folders error:", error)
      return NextResponse.json(
        { error: "Failed to fetch folders" },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    console.error("Fetch content folders error:", error)
    return NextResponse.json(
      { error: "Failed to fetch folders" },
      { status: 500 }
    )
  }
}

// Used by upload form to create a new recording folder
export async function POST(request: Request) {
  try {
    const auth = await verifyFolderAccess()

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const body = await request.json()
    const parsed = CreateFolderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    const folderName = parsed.data.name.trim()
    const baseSlug = createSlug(folderName)

    const { data: existingFolder } = await admin
      .from("content_folders")
      .select("id, name, slug, description, created_at")
      .ilike("name", folderName)
      .maybeSingle()

    if (existingFolder) {
      return NextResponse.json({ data: existingFolder }, { status: 200 })
    }

    const { data, error } = await admin
      .from("content_folders")
      .insert({
        name: folderName,
        slug: baseSlug,
        description: parsed.data.description?.trim() || null,
      })
      .select("id, name, slug, description, created_at")
      .single()

    if (error) {
      console.error("Create folder error:", error)
      return NextResponse.json(
        { error: "Failed to create folder" },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Create content folder error:", error)
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    )
  }
}