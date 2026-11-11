import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const CreateFolderSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  // Created from the Karma Recode content page.
  is_karma_recode: z.boolean().optional(),
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

    const columns = "id, name, slug, description, cover_image_url, sort_order, parent_id, created_at"
    const load = (select: string) =>
      admin
        .from("content_folders")
        .select(select)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })

    let { data, error } = await load(`${columns}, is_karma_recode`)
    // Before the Karma Recode migration runs, the column doesn't exist yet.
    if (error?.message.includes("is_karma_recode")) {
      ;({ data, error } = await load(columns))
    }

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

    const wantsKarmaRecode = parsed.data.is_karma_recode === true
    const { data: existingFolder } = await admin
      .from("content_folders")
      .select(`id, name, slug, description, cover_image_url, sort_order, parent_id, created_at${wantsKarmaRecode ? ", is_karma_recode" : ""}`)
      .ilike("name", folderName)
      .maybeSingle()

    // Names are unique across both halves; don't hand back a Recordings
    // folder to the Karma Recode page (or the other way round).
    if (existingFolder && wantsKarmaRecode !== !!(existingFolder as { is_karma_recode?: boolean }).is_karma_recode) {
      return NextResponse.json(
        {
          error: wantsKarmaRecode
            ? `There's already a Recordings folder called "${folderName}". Pick another name.`
            : `There's already a Karma Recode folder called "${folderName}". Pick another name.`,
        },
        { status: 409 }
      )
    }

    if (existingFolder) {
      return NextResponse.json({ data: existingFolder }, { status: 200 })
    }

    const { data, error } = await admin
      .from("content_folders")
      .insert({
        name: folderName,
        slug: baseSlug,
        description: parsed.data.description?.trim() || null,
        ...(wantsKarmaRecode ? { is_karma_recode: true } : {}),
      })
      .select(`id, name, slug, description, cover_image_url, sort_order, parent_id, created_at${wantsKarmaRecode ? ", is_karma_recode" : ""}`)
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