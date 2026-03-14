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
  documents: z.array(z.object({
    label: z.string().min(1),
    file_url: z.string(),
    sort_order: z.number(),
  })).optional(),
})

const VideoSummarySchema = z.object({
  content_type: z.literal("video_summary"),
  title: z.string().min(1),
  youtube_url: z.string().url(),
  youtube_video_id: z.string().optional(),
  category: z.string().min(1),
  video_duration_minutes: z.number().optional(),
  read_time_minutes: z.number().optional(),
  one_line_takeaway: z.string().optional(),
  key_points: z
    .array(z.object({ point: z.string(), timestamp: z.string().optional() }))
    .optional(),
  action_items: z.array(z.string()).optional(),
  full_summary: z.string().optional(),
  is_published: z.boolean().default(true),
})

const CreateContentSchema = z.discriminatedUnion("content_type", [
  ResourceSchema,
  VideoSummarySchema,
])

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

      // Insert resource_documents if provided
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
          // Resource was created, just warn about documents
        }
      }

      return NextResponse.json(created, { status: 201 })
    }

    // video_summary
    const { content_type: __, ...videoData } = parsed.data
    const { data: created, error } = await admin
      .from("video_summaries")
      .insert(videoData)
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
