import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { extractVideoId, fetchTranscript } from "@/lib/youtube"
import { generateVideoSummary } from "@/lib/ai/summarize"

const SummarizeSchema = z.object({
  youtube_url: z.string().url(),
  manual_transcript: z.string().optional(),
})

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
    const parsed = SummarizeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      )
    }

    const { youtube_url, manual_transcript } = parsed.data
    const videoId = extractVideoId(youtube_url)

    // Get transcript — try auto first, then manual fallback
    let transcript = manual_transcript ?? null

    if (!transcript) {
      transcript = await fetchTranscript(youtube_url)
    }

    if (!transcript) {
      return NextResponse.json(
        {
          error: "no_transcript",
          message:
            "Could not fetch the transcript for this video. Please paste the transcript manually.",
        },
        { status: 422 }
      )
    }

    // Generate AI summary
    const summary = await generateVideoSummary(transcript, youtube_url)

    return NextResponse.json({
      ...summary,
      youtube_url,
      youtube_video_id: videoId,
    })
  } catch (error) {
    console.error("AI summarize error:", error)
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    )
  }
}
