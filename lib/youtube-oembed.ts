/**
 * Minimal YouTube helpers for bulk recording upload.
 *
 * oEmbed is used instead of the Data API because it needs no key and no quota.
 * It returns the public title and thumbnail for any watchable video, which is
 * all the bulk form needs — admins can rename afterwards.
 */

export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim())

    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null
    }

    if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "m.youtube.com" ||
      parsed.hostname === "www.youtube-nocookie.com"
    ) {
      if (parsed.searchParams.has("v")) {
        return parsed.searchParams.get("v")
      }

      const match = parsed.pathname.match(/^\/(embed|shorts|live|v)\/([^/?]+)/)
      if (match) return match[2]
    }

    return null
  } catch {
    return null
  }
}

export type OEmbedResult = {
  title: string | null
  authorName: string | null
}

/**
 * Fetch a video's public title. Returns nulls rather than throwing, so one
 * unavailable video never fails a whole batch — the caller falls back to
 * whatever title the admin typed.
 */
export async function fetchVideoMeta(videoId: string): Promise<OEmbedResult> {
  try {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`

    const res = await fetch(endpoint, {
      // These titles change rarely; let the platform cache them for a day.
      next: { revalidate: 86400 },
    })

    if (!res.ok) return { title: null, authorName: null }

    const data = (await res.json()) as {
      title?: string
      author_name?: string
    }

    return {
      title: data.title ?? null,
      authorName: data.author_name ?? null,
    }
  } catch {
    return { title: null, authorName: null }
  }
}
