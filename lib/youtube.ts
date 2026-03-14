import { YoutubeTranscript } from "youtube-transcript"

/**
 * Extracts YouTube video ID from various URL formats.
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
 */
export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)

    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null
    }

    if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com"
    ) {
      // /watch?v=VIDEO_ID
      if (parsed.searchParams.has("v")) {
        return parsed.searchParams.get("v")
      }
      // /embed/VIDEO_ID or /shorts/VIDEO_ID
      const match = parsed.pathname.match(/^\/(embed|shorts)\/([^/?]+)/)
      if (match) return match[2]
    }

    return null
  } catch {
    return null
  }
}

/**
 * Fetches transcript text from a YouTube video.
 * Returns null if transcript is unavailable.
 */
export async function fetchTranscript(
  videoIdOrUrl: string
): Promise<string | null> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoIdOrUrl)
    if (!segments || segments.length === 0) return null

    return segments.map((s) => s.text).join(" ")
  } catch (error) {
    console.error("Failed to fetch transcript:", error)
    return null
  }
}
