import Link from "next/link"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { fetchCategories } from "@/lib/content"
import { ContentGrid } from "@/components/content/ContentGrid"
import { ContentFilters } from "@/components/content/ContentFilters"
import { ArrowRight, Folder, Video } from "lucide-react"
import type { ContentItem } from "@/types"

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
  created_at: string
  videoCount: number
}

export default async function ContentPage({ searchParams }: Props) {
  const params = await searchParams

  const folderId = params.folder
  const category = params.category
  const sort = params.sort ?? "newest"
  const q = params.q ?? ""

  const [categories, folders, items] = await Promise.all([
    fetchCategories(),
    fetchFolders(),
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
            : "Choose a folder to watch session recordings for your daily wellbeing practice."}
        </p>
      </div>

      <Suspense>
        <ContentFilters categories={categories} />
      </Suspense>

      <div className="mt-6">
        {folderId ? (
          <div className="space-y-5">
            <Link
              href="/content"
              className="inline-flex items-center text-sm font-medium text-[#8A6A22] hover:text-[#4B3A25]"
            >
              ← Back to folders
            </Link>

            <ContentGrid items={items} />
          </div>
        ) : (
          <FolderGrid folders={folders} />
        )}
      </div>
    </div>
  )
}

async function fetchFolders(): Promise<ContentFolder[]> {
  const supabase = await createClient()

  const { data: folders } = await supabase
    .from("content_folders")
    .select("id, name, slug, description, created_at")
    .order("created_at", { ascending: false })

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

function FolderGrid({ folders }: { folders: ContentFolder[] }) {
  if (folders.length === 0) {
    return (
      <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-3xl border border-dashed border-[#C89B3C]/30 bg-[#F7F0E3]/70 px-6 py-12 text-center text-[#4B3A25]">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#C89B3C]/10">
          <Folder className="size-8 text-[#C89B3C]" />
        </div>

        <h3 className="font-serif text-xl font-semibold text-[#4B3A25]">
          No folders found
        </h3>

        <p className="mt-1 max-w-xs text-sm leading-6 text-[#6F7358]">
          Create folders from the admin panel and assign videos to them.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
      {folders.map((folder) => (
        <Link
          key={folder.id}
          href={`/content?folder=${folder.id}`}
          className="group block"
        >
          <article className="space-y-3">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#F7F0E3] shadow-sm ring-1 ring-[#C89B3C]/15 transition group-hover:shadow-md">
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F7F0E3] to-[#E8DDC8]">
                <Folder className="size-14 text-[#8A6A22]" />
              </div>

              <div className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-1 text-[11px] font-medium text-white">
                {folder.videoCount} video{folder.videoCount === 1 ? "" : "s"}
              </div>
            </div>

            <div>
              <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#2F271C] group-hover:text-[#8A6A22]">
                {folder.name}
              </h3>

              <div className="mt-1 flex items-center gap-1.5 text-xs text-[#6F7358]">
                <Video className="size-3.5 shrink-0" />
                <span>
                  {folder.videoCount} recording
                  {folder.videoCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#8A6A22]">
                Open folder
                <ArrowRight className="size-3.5" />
              </div>
            </div>
          </article>
        </Link>
      ))}
    </div>
  )
}