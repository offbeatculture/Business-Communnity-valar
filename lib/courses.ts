import { createClient } from "@/lib/supabase/server"
import type { Course, CourseLesson, CourseWithLessons } from "@/types"

/** Thumbnail for a recording, derived from its YouTube id — same rule as ContentCard. */
export function courseThumbnail(videoId?: string | null) {
  if (!videoId) return null
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

/**
 * Published courses with a lesson count, for the card row on the library page.
 */
export async function fetchCourses(): Promise<
  (Course & { lessonCount: number; firstVideoId: string | null })[]
> {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (!courses || courses.length === 0) return []

  // One round trip for every course's lessons, then fold in memory. The set is
  // small (a handful of courses, tens of lessons) so this stays cheap.
  const { data: memberships } = await supabase
    .from("course_videos")
    .select("course_id, sort_order, video:video_summaries (youtube_video_id, is_published)")
    .in(
      "course_id",
      courses.map((c) => c.id)
    )
    .order("sort_order", { ascending: true })

  const counts = new Map<string, number>()
  const firstVideo = new Map<string, string | null>()

  for (const row of memberships ?? []) {
    const video = row.video as unknown as
      | { youtube_video_id: string | null; is_published: boolean }
      | null

    // A course row can outlive an unpublished recording. Don't count those.
    if (!video || !video.is_published) continue

    counts.set(row.course_id, (counts.get(row.course_id) ?? 0) + 1)

    if (!firstVideo.has(row.course_id)) {
      firstVideo.set(row.course_id, video.youtube_video_id)
    }
  }

  return (courses as Course[]).map((course) => ({
    ...course,
    lessonCount: counts.get(course.id) ?? 0,
    firstVideoId: firstVideo.get(course.id) ?? null,
  }))
}

/**
 * A single course with its lessons in playback order.
 *
 * Returns null when the slug is unknown or the course is unpublished, so the
 * page can 404 rather than render an empty player.
 */
export async function fetchCourseBySlug(
  slug: string
): Promise<CourseWithLessons | null> {
  const supabase = await createClient()

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle()

  if (!course) return null

  const { data: rows } = await supabase
    .from("course_videos")
    .select("sort_order, video:video_summaries (*)")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true })

  const lessons: CourseLesson[] = (rows ?? [])
    .map((row) => {
      const video = row.video as unknown as CourseLesson | null
      if (!video || !video.is_published) return null
      return { ...video, sort_order: row.sort_order }
    })
    .filter((lesson): lesson is CourseLesson => lesson !== null)

  return { ...(course as Course), lessons }
}
