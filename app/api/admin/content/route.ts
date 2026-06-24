import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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

const CreateContentSchema = z.discriminatedUnion("content_type", [
  ResourceSchema,
  VideoSummarySchema,
])

async function verifyAdmin() {
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

  if (profile?.role !== "admin") {
    return { user: null, error: "Forbidden", status: 403 }
  }

  return { user, error: null, status: 200 }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin()

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const body = await request.json()
    const parsed = CreateContentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { content_type } = parsed.data

    if (content_type === "resource") {
      const { content_type: _, documents, ...resourceData } = parsed.data

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