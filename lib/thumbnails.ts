/**
 * One rule for "what picture represents this recording", used everywhere a
 * recording appears: library cards, the playlist sidebar, course covers and
 * folder covers.
 *
 * A custom thumbnail always wins. Without one we fall back to YouTube's own
 * auto-generated image, which is what every recording used before custom
 * covers existed.
 */

type ThumbnailSource = {
  thumbnail_url?: string | null
  youtube_video_id?: string | null
}

/**
 * `hq` (480x360) for cards and hero images, `mq` (320x180) for the small
 * playlist rows. The size only affects the YouTube fallback — a custom cover is
 * served at whatever size it was uploaded.
 */
export function videoThumbnail(
  video: ThumbnailSource | null | undefined,
  size: "hq" | "mq" = "hq"
): string | null {
  if (!video) return null

  const custom = video.thumbnail_url?.trim()
  if (custom) return custom

  if (!video.youtube_video_id) return null

  return `https://img.youtube.com/vi/${video.youtube_video_id}/${size}default.jpg`
}
