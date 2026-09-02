import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { koshaWeekByKey } from "@/lib/panchakosha"

export const BUCKET = "panchakosha"

/**
 * Signed URLs must outlive the whole watch, not just the first request.
 * A <video> element keeps hitting the same URL for byte ranges as the
 * member scrubs or buffers, so a 60-second URL (fine for a one-shot PDF
 * download) would 403 partway through playback.
 *
 * Four hours covers any realistic session while still expiring, so a
 * shared link dies the same day.
 */
const SIGNED_URL_TTL_SECONDS = 4 * 60 * 60

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kosha: string }> },
) {
  try {
    const { kosha } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Paid content. Middleware already gates /api, but this route hands
    // out a URL that works without a session for four hours, so it
    // re-checks rather than trusting the layer above.
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const week = koshaWeekByKey(kosha)
    if (!week?.videoPath) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(week.videoPath, SIGNED_URL_TTL_SECONDS)

    if (error || !data?.signedUrl) {
      console.error("Signed URL failed for", week.videoPath, error)
      return NextResponse.json(
        { error: "This recording is not available yet" },
        { status: 404 },
      )
    }

    // 302 rather than returning JSON: the browser follows it straight
    // into the <video> element, and range requests go to storage
    // directly instead of proxying every byte through this server.
    return NextResponse.redirect(data.signedUrl, 302)
  } catch (error) {
    console.error("GET /api/panchakosha/video/[kosha] error:", error)
    return NextResponse.json({ error: "Could not load the video" }, { status: 500 })
  }
}
