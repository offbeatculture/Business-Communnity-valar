// Create many recordings in one folder in a single request.
//
// The single-video route (/api/admin/content) stays as it is — it runs the AI
// summariser and takes a fully edited payload. This route is the opposite: it
// takes a list of YouTube links and publishes them with titles only, which is
// what adding a month of session recordings actually looks like.

import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyContentAdmin } from "@/lib/auth/content-admin"
import { extractVideoId, fetchVideoMeta } from "@/lib/youtube-oembed"

const MAX_VIDEOS = 50

const BulkVideoSchema = z.object({
  folder_id: z.string().uuid(),
  category: z.string().min(1).default("recordings"),
  is_published: z.boolean().default(true),
  videos: z
    .array(
      z.object({
        youtube_url: z.string().min(1),
        // Optional: when absent the title is read from YouTube.
        title: z.string().optional(),
      })
    )
    .min(1)
    .max(MAX_VIDEOS),
})

export type BulkVideoOutcome = {
  youtube_url: string
  status: "created" | "skipped" | "failed"
  title?: string
  reason?: string
}

export async function POST(request: Request) {
  try {
    const auth = await verifyContentAdmin()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const parsed = BulkVideoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { folder_id, category, is_published, videos } = parsed.data
    const admin = createAdminClient()

    // Confirm the folder exists before creating anything, so a typo in the id
    // cannot scatter orphaned recordings through the library.
    const { data: folder } = await admin
      .from("content_folders")
      .select("id")
      .eq("id", folder_id)
      .maybeSingle()

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    // Resolve every link first. Parsing and title lookup happen in parallel;
    // nothing is written until the whole batch is understood.
    const resolved = await Promise.all(
      videos.map(async (video) => {
        const url = video.youtube_url.trim()
        const videoId = extractVideoId(url)

        if (!videoId) {
          return {
            url,
            videoId: null,
            title: video.title?.trim() ?? "",
            reason: "Not a recognisable YouTube link",
          }
        }

        const typedTitle = video.title?.trim()

        if (typedTitle) {
          return { url, videoId, title: typedTitle, reason: null }
        }

        const meta = await fetchVideoMeta(videoId)

        return {
          url,
          videoId,
          title: meta.title ?? "",
          reason: meta.title ? null : "Could not read the title from YouTube",
        }
      })
    )

    // Anything already in the library is skipped rather than duplicated. Pasting
    // an overlapping list twice is the normal way this form gets used.
    const candidateIds = resolved
      .map((item) => item.videoId)
      .filter((id): id is string => Boolean(id))

    const existingIds = new Set<string>()

    if (candidateIds.length > 0) {
      const { data: existing } = await admin
        .from("video_summaries")
        .select("youtube_video_id")
        .in("youtube_video_id", candidateIds)

      for (const row of existing ?? []) {
        if (row.youtube_video_id) existingIds.add(row.youtube_video_id)
      }
    }

    const results: BulkVideoOutcome[] = []
    const rowsToInsert: Record<string, unknown>[] = []

    for (const item of resolved) {
      if (!item.videoId || !item.title) {
        results.push({
          youtube_url: item.url,
          status: "failed",
          reason: item.reason ?? "Missing a title",
        })
        continue
      }

      if (existingIds.has(item.videoId)) {
        results.push({
          youtube_url: item.url,
          status: "skipped",
          title: item.title,
          reason: "Already in the library",
        })
        continue
      }

      // Guard against the same link appearing twice in one paste.
      existingIds.add(item.videoId)

      rowsToInsert.push({
        folder_id,
        title: item.title,
        youtube_url: item.url,
        youtube_video_id: item.videoId,
        category,
        is_published,
      })

      results.push({
        youtube_url: item.url,
        status: "created",
        title: item.title,
      })
    }

    if (rowsToInsert.length > 0) {
      const { error } = await admin.from("video_summaries").insert(rowsToInsert)

      if (error) {
        console.error("Bulk video insert error:", error)
        return NextResponse.json(
          { error: "Failed to save the recordings" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      created: results.filter((r) => r.status === "created").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    })
  } catch (error) {
    console.error("POST /api/admin/content/bulk-videos error:", error)
    return NextResponse.json(
      { error: "Failed to save the recordings" },
      { status: 500 }
    )
  }
}
