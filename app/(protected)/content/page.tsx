import Link from "next/link"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { fetchCategories } from "@/lib/content"
import { fetchCourses } from "@/lib/courses"
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
  /** Library ordering. Lower sorts first; negative pins above everything else. */
  sort_order: number
  created_at: string
  videoCount: number
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

  const { data: folders, error } = await supabase
    .from("content_folders")
    .select("id, name, slug, description, cover_image_url, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  // Without this the page renders an empty library whether there genuinely are
  // no folders or the query failed — for example because a migration adding a
  // column has not been run yet. Those two look identical to a member and are
  // very different to debug.
  if (error) {
    console.error("[library] Failed to load content folders:", error.message)
  }

  // Only used for the recording count on each card. A folder with no cover of
  // its own shows no image — it never borrows a recording's thumbnail.
  const { data: videos } = await supabase
    .from("video_summaries")
    .select("id, folder_id")
    .eq("is_published", true)
    .not("folder_id", "is", null)

  const countMap = new Map<string, number>()

  ;(videos ?? []).forEach((video) => {
    if (!video.folder_id) return
    countMap.set(video.folder_id, (countMap.get(video.folder_id) ?? 0) + 1)
  })

  return (folders ?? []).map((folder) => ({
    ...folder,
    videoCount: countMap.get(folder.id) ?? 0,
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
      ),
      resources:video_resources (
        id,
        label,
        sort_order
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
    cover: course.thumbnail_url,
    videoCount: course.lessonCount,
    kind: "course",
    sortOrder: course.sort_order,
    createdAt: course.created_at,
  }))

  const folderEntries: LibraryEntry[] = folders.map((folder) => ({
    id: `folder-${folder.id}`,
    href: `/content?folder=${folder.id}`,
    title: folder.name,
    description: folder.description,
    cover: folder.cover_image_url,
    videoCount: folder.videoCount,
    kind: "folder",
    sortOrder: folder.sort_order,
    createdAt: folder.created_at,
  }))

  // Courses and folders share one ordering so a pinned folder can genuinely
  // lead the library. Lower sort_order first, then newest first within a tie.
  return [...courseEntries, ...folderEntries].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}
