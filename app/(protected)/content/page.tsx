import Link from "next/link"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { fetchCategories } from "@/lib/content"
import { fetchCourses } from "@/lib/courses"
import { videoThumbnail } from "@/lib/thumbnails"
import { ContentFilters } from "@/components/content/ContentFilters"
import { PlaylistPlayer } from "@/components/content/PlaylistPlayer"
import { PlayerSkeleton } from "@/components/content/PlayerSkeleton"
import { LibraryGrid, type LibraryEntry } from "@/components/content/LibraryGrid"
import type { ContentItem, VideoSummary } from "@/types"

type Props = {
  searchParams: Promise<{
    type?: string
    category?: string
    sort?: string
    q?: string
    page?: string
    folder?: string
  }>
}

type ContentFolder = {
  id: string
  name: string
  slug: string
  description: string | null
  cover_image_url: string | null
  created_at: string
  videoCount: number
  /** Newest recording's thumbnail, used when the folder has no cover of its own. */
  fallbackThumbnail: string | null
}

export default async function ContentPage({ searchParams }: Props) {
  const params = await searchParams

  const folderId = params.folder
  const category = params.category
  const sort = params.sort ?? "newest"
  const q = params.q ?? ""

  const [categories, folders, courses, items] = await Promise.all([
    fetchCategories(),
    fetchFolders(),
    fetchCourses(),
    folderId
      ? fetchContent({
          folderId,
          category,
          sort,
          q,
        })
      : Promise.resolve([]),
  ])

  const selectedFolder = folderId
    ? folders.find((folder) => folder.id === folderId)
    : null

  return (
    <div>
      <div className="mb-6 text-[#4B3A25]">
        <p className="text-sm font-medium text-[#8A6A22]">
          Daily Breathwork
        </p>

        <h1 className="mb-1 font-serif text-3xl font-semibold text-[#4B3A25]">
          {selectedFolder ? selectedFolder.name : "Breathwork Library"}
        </h1>

        <p className="text-sm font-medium leading-6 text-[#6F7358]">
          {selectedFolder
            ? `${selectedFolder.videoCount} recording${
                selectedFolder.videoCount === 1 ? "" : "s"
              } inside this folder.`
            : "Open a collection to watch session recordings for your daily wellbeing practice."}
        </p>
      </div>

      <Suspense>
        <ContentFilters categories={categories} />
      </Suspense>

      <div className="mt-6">
        {folderId ? (
          <Suspense fallback={<PlayerSkeleton />}>
            <PlaylistPlayer
              title={selectedFolder?.name ?? "Recordings"}
              items={items as VideoSummary[]}
              backHref="/content"
              backLabel="Back to folders"
              emptyTitle="No recordings in this folder"
              emptyBody="Once videos are added to this folder from the admin panel, they will play here."
            />
          </Suspense>
        ) : (
          <LibraryGrid entries={buildEntries(courses, folders)} />
        )}
      </div>
    </div>
  )
}

async function fetchFolders(): Promise<ContentFolder[]> {
  const supabase = await createClient()

  const { data: folders } = await supabase
    .from("content_folders")
    .select("id, name, slug, description, cover_image_url, created_at")
    .order("created_at", { ascending: false })

  // Ordered newest first so the first video seen per folder is also the one
  // whose thumbnail stands in when the folder has no cover image.
  const { data: videos } = await supabase
    .from("video_summaries")
    .select("id, folder_id, youtube_video_id, thumbnail_url, created_at")
    .eq("is_published", true)
    .not("folder_id", "is", null)
    .order("created_at", { ascending: false })

  const countMap = new Map<string, number>()
  const thumbnailMap = new Map<string, string | null>()

  ;(videos ?? []).forEach((video) => {
    if (!video.folder_id) return

    countMap.set(video.folder_id, (countMap.get(video.folder_id) ?? 0) + 1)

    if (!thumbnailMap.has(video.folder_id)) {
      thumbnailMap.set(video.folder_id, videoThumbnail(video))
    }
  })

  return (folders ?? []).map((folder) => ({
    ...folder,
    videoCount: countMap.get(folder.id) ?? 0,
    fallbackThumbnail: thumbnailMap.get(folder.id) ?? null,
  }))
}

async function fetchContent(filters: {
  folderId: string
  category?: string
  sort: string
  q: string
}): Promise<ContentItem[]> {
  const supabase = await createClient()
  const { folderId, category, sort, q } = filters

  let query = supabase
    .from("video_summaries")
    .select(`
      *,
      folder:content_folders (
        id,
        name,
        slug
      )
    `)
    .eq("is_published", true)
    .eq("folder_id", folderId)

  if (category) {
    query = query.eq("category", category)
  }

  if (q) {
    query = query.or(
      `title.ilike.%${q}%,one_line_takeaway.ilike.%${q}%,full_summary.ilike.%${q}%`
    )
  }

  const { data } = await query

  const items = (data ?? []).map((video) => ({
    ...video,
    content_type: "video_summary",
  })) as ContentItem[]

  if (sort === "popular") {
    items.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
  } else if (sort === "az") {
    items.sort((a, b) => a.title.localeCompare(b.title))
  } else {
    items.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  return items
}

/**
 * Flattens courses and folders into one list of cards.
 *
 * Courses lead because they are curated sequences someone chose to build;
 * the monthly folders follow, newest first, which is the order fetchFolders
 * already returns them in.
 */
function buildEntries(
  courses: Awaited<ReturnType<typeof fetchCourses>>,
  folders: ContentFolder[]
): LibraryEntry[] {
  const courseEntries: LibraryEntry[] = courses.map((course) => ({
    id: `course-${course.id}`,
    href: `/courses/${course.slug}`,
    title: course.title,
    description: course.description,
    cover: course.thumbnail_url ?? course.fallbackThumbnail,
    videoCount: course.lessonCount,
    kind: "course",
  }))

  const folderEntries: LibraryEntry[] = folders.map((folder) => ({
    id: `folder-${folder.id}`,
    href: `/content?folder=${folder.id}`,
    title: folder.name,
    description: folder.description,
    cover: folder.cover_image_url ?? folder.fallbackThumbnail,
    videoCount: folder.videoCount,
    kind: "folder",
  }))

  return [...courseEntries, ...folderEntries]
}
