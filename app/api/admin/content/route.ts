// This API route is used to create/upload admin content.
// It supports:
// 1. Resource upload - only full admin can use
// 2. Video recording upload - admin + recording_admin can use

import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// -----------------------------
// Schema for resource upload
// Example: cheat sheet, template, document
// Only full admin should be allowed to upload this
// -----------------------------
const ResourceSchema = z.object({
  content_type: z.literal("resource"),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  type: z.enum(["cheat_sheet", "template"]),
  file_url: z.string().optional(),
  external_url: z.string().url().optional(),
  is_published: z.boolean().default(true),
  documents: z
    .array(
      z.object({
        label: z.string().min(1),
        file_url: z.string(),
        sort_order: z.number(),
      })
    )
    .optional(),
})

// -----------------------------
// Schema for video/recording upload
// This is the one used for Breathwork Library recordings
// admin and recording_admin can upload this
// -----------------------------
const VideoSummarySchema = z.object({
  content_type: z.literal("video_summary"),
  folder_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  youtube_url: z.string().url(),
  youtube_video_id: z.string().optional().nullable(),
  category: z.string().min(1),
  video_duration_minutes: z.number().optional().nullable(),
  read_time_minutes: z.number().optional().nullable(),
  one_line_takeaway: z.string().optional().nullable(),
  key_points: z
    .array(z.object({ point: z.string(), timestamp: z.string().optional() }))
    .optional()
    .nullable(),
  action_items: z.array(z.string()).optional().nullable(),
  full_summary: z.string().optional().nullable(),
  is_published: z.boolean().default(true),
})

// -----------------------------
// This tells the API:
// request can be either resource OR video_summary
// -----------------------------
const CreateContentSchema = z.discriminatedUnion("content_type", [
  ResourceSchema,
  VideoSummarySchema,
])

// -----------------------------
// Allowed roles for this API
// admin = full admin
// recording_admin = restricted user who can upload only recordings
// -----------------------------
type AllowedRole = "admin" | "recording_admin"

// -----------------------------
// This function checks who is logged in
// and whether they are allowed to upload content
// -----------------------------
async function verifyContentUploader(): Promise<{
  user: any
  role: AllowedRole | null
  error: string | null
  status: number
}> {
  const supabase = await createClient()

  // Get currently logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user is logged in
  if (!user) {
    return { user: null, role: null, error: "Unauthorized", status: 401 }
  }

  // Get user's role from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  // Only admin and recording_admin can use this API
  if (profile?.role !== "admin" && profile?.role !== "recording_admin") {
    return { user: null, role: null, error: "Forbidden", status: 403 }
  }

  // User is allowed
  return {
    user,
    role: profile.role as AllowedRole,
    error: null,
    status: 200,
  }
}

// -----------------------------
// POST API
// This runs when someone submits upload form
// -----------------------------
export async function POST(request: Request) {
  try {
    // First check permission
    const auth = await verifyContentUploader()

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    // Read submitted form data
    const body = await request.json()

    // Validate the submitted data
    const parsed = CreateContentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Admin client is used to insert into Supabase safely from server
    const admin = createAdminClient()

    const { content_type } = parsed.data

    // -----------------------------
    // IMPORTANT RESTRICTION
    // If user is recording_admin,
    // they can upload ONLY video_summary.
    // They cannot upload resources.
    // -----------------------------
    if (auth.role === "recording_admin" && content_type !== "video_summary") {
      return NextResponse.json(
        { error: "Recording admins can only upload videos" },
        { status: 403 }
      )
    }

    // -----------------------------
    // Resource upload section
    // Only full admin can reach here
    // -----------------------------
    if (content_type === "resource") {
      const { content_type: _, documents, ...resourceData } = parsed.data

      // Insert resource into resources table
      const { data: created, error } = await admin
        .from("resources")
        .insert(resourceData)
        .select()
        .single()

      if (error) {
        console.error("Create resource error:", error)
        return NextResponse.json(
          { error: "Failed to create resource" },
          { status: 500 }
        )
      }

      // If resource has documents, insert those documents also
      if (documents && documents.length > 0) {
        const docRows = documents.map((doc) => ({
          resource_id: created.id,
          label: doc.label,
          file_url: doc.file_url,
          sort_order: doc.sort_order,
        }))

        const { error: docError } = await admin
          .from("resource_documents")
          .insert(docRows)

        if (docError) {
          console.error("Create resource documents error:", docError)
        }
      }

      return NextResponse.json(created, { status: 201 })
    }

    // -----------------------------
    // Video recording upload section
    // admin and recording_admin can reach here
    // This inserts into video_summaries table
    // -----------------------------
    const { content_type: _, ...videoData } = parsed.data

    const { data: created, error } = await admin
      .from("video_summaries")
      .insert({
        ...videoData,
        folder_id: videoData.folder_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Create video summary error:", error)
      return NextResponse.json(
        { error: "Failed to create video summary" },
        { status: 500 }
      )
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Create content error:", error)
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    )
  }
}