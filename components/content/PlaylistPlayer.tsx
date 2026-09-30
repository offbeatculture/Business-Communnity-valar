"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Eye,
  FileText,
  Play,
  Video,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { videoThumbnail } from "@/lib/thumbnails"
import type { VideoSummary } from "@/types"

type PlaylistPlayerProps = {
  /** Playlist name, shown in the sidebar header and under the video title. */
  title: string
  /** Recordings in playback order. The list is treated as newest-first. */
  items: VideoSummary[]
  /** Where the "back" link goes, e.g. /content. */
  backHref: string
  backLabel: string
  /** Wording for the empty state when the playlist has no recordings. */
  emptyTitle?: string
  emptyBody?: string
}

// These cards are hardcoded light (same as the rest of the library) while the
// app's theme tokens are tuned for a dark background, so the `dark:` variants
// baked into TabsTrigger have to be overridden explicitly — otherwise the
// active tab renders cream-on-cream and disappears.
const tabTriggerClass = cn(
  "flex-none px-3",
  "text-[#6F7358] hover:text-[#4B3A25]",
  "dark:text-[#6F7358] dark:hover:text-[#4B3A25]",
  "data-[state=active]:bg-transparent data-[state=active]:text-[#8A6A22]",
  "dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-[#8A6A22]",
  "after:bg-[#C89B3C]"
)


/**
 * Video player with a playlist sidebar, About/Transcript tabs and
 * newer/older navigation.
 *
 * Used for both a course (/courses/[slug]) and a library folder
 * (/content?folder=...), so it knows nothing about either — it takes a title
 * and a list of recordings.
 */
export function PlaylistPlayer({
  title,
  items: lessons,
  backHref,
  backLabel,
  emptyTitle = "Nothing here yet",
  emptyBody = "Once recordings are added, they will play here.",
}: PlaylistPlayerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // The playing lesson is driven by ?v= so a lesson is linkable and the browser
  // back button steps through the playlist. An unknown or missing id falls back
  // to the first lesson rather than rendering an empty player.
  const requestedId = searchParams.get("v")

  const activeIndex = useMemo(() => {
    const found = lessons.findIndex((lesson) => lesson.id === requestedId)
    return found === -1 ? 0 : found
  }, [lessons, requestedId])

  const active = lessons[activeIndex]

  // Count a view the same way /content/[id] does, so a lesson watched inside the
  // course is not invisible in the stats.
  useEffect(() => {
    if (!active) return
    fetch(`/api/content/${active.id}/view`, { method: "POST" }).catch(() => {})
  }, [active])

  // Stay on whatever route mounted the player, and keep the other query params.
  // The folder view lives at /content?folder=<id>, so dropping them would throw
  // the viewer back out to the folder list mid-playlist.
  function select(lessonId: string) {
    const next = new URLSearchParams(searchParams.toString())
    next.set("v", lessonId)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  if (!active) {
    return (
      <div className="rounded-3xl border border-dashed border-[#C89B3C]/30 bg-[#F7F0E3]/70 px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#C89B3C]/10">
          <Video className="size-8 text-[#C89B3C]" />
        </div>

        <h2 className="font-serif text-xl font-semibold text-[#4B3A25]">
          {emptyTitle}
        </h2>

        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#6F7358]">
          {emptyBody}
        </p>
      </div>
    )
  }

  // The playlist runs newest first, so the next item down the list is older.
  const older = lessons[activeIndex + 1]
  const newer = lessons[activeIndex - 1]

  return (
    <div>
      <Link
        href={backHref}
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8A6A22] transition hover:text-[#4B3A25]"
      >
        <ArrowLeft className="size-4" />
        {backLabel}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── Player column ─────────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl bg-black shadow-sm ring-1 ring-[#C89B3C]/15">
            <div className="aspect-video">
              {active.youtube_video_id ? (
                <iframe
                  key={active.id}
                  src={`https://www.youtube-nocookie.com/embed/${active.youtube_video_id}?rel=0&modestbranding=1&controls=1&fs=1&iv_load_policy=3&playsinline=1`}
                  title={active.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
                  This session has no video attached yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-[#F7F0E3] p-5 shadow-sm ring-1 ring-[#C89B3C]/15">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="font-serif text-xl font-semibold leading-snug text-[#2F271C] sm:text-2xl">
                  {active.title}
                </h1>

                <p className="mt-1 text-sm text-[#6F7358]">
                  {title} · {lessons.length} session
                  {lessons.length === 1 ? "" : "s"}, newest first
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                {newer && (
                  <button
                    type="button"
                    onClick={() => select(newer.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#C89B3C]/30 px-4 py-2 text-sm font-semibold text-[#6B4F16] transition hover:bg-[#E8DDC8]"
                  >
                    <ArrowLeft className="size-4" />
                    Newer
                  </button>
                )}

                {older && (
                  <button
                    type="button"
                    onClick={() => select(older.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#D4A936] px-4 py-2 text-sm font-semibold text-[#2F271C] transition hover:bg-[#C89B3C]"
                  >
                    Older
                    <ArrowRight className="size-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6F7358]">
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3.5" />
                {active.view_count ?? 0} views
              </span>

              {active.video_duration_minutes && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {active.video_duration_minutes} min
                </span>
              )}

              <span>
                {new Date(active.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <Tabs defaultValue="about" className="mt-5" key={active.id}>
              {/* The shared theme tokens (--foreground, --muted-foreground) are
                  tuned for a dark background, so an active tab would render
                  cream-on-cream here. These cards are hardcoded light, like the
                  rest of the library, so the tab colors are too. */}
              <TabsList
                variant="line"
                className="w-full justify-start border-b border-[#C89B3C]/25 pb-1"
              >
                <TabsTrigger value="about" className={tabTriggerClass}>
                  About
                </TabsTrigger>
                <TabsTrigger value="transcript" className={tabTriggerClass}>
                  Transcript
                </TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="pt-4">
                <AboutTab lesson={active} />
              </TabsContent>

              <TabsContent value="transcript" className="pt-4">
                {active.transcript ? (
                  <div className="max-h-[26rem] overflow-y-auto whitespace-pre-line pr-2 text-sm leading-7 text-[#4B3A25]">
                    {active.transcript}
                  </div>
                ) : (
                  <EmptyNote>
                    No transcript for this session yet.
                  </EmptyNote>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* ── Playlist column ───────────────────────────────────────────── */}
        {/* Deliberately not sticky: the app sets overflow-x-hidden on <html>,
            which makes html the scroll container and stops position:sticky
            engaging for descendants. A sticky class here would silently do
            nothing, so the playlist simply sits beside the video and scrolls
            with it. */}
        <aside className="lg:self-start">
          <div className="overflow-hidden rounded-2xl bg-[#F7F0E3] shadow-sm ring-1 ring-[#C89B3C]/15">
            <div className="border-b border-[#C89B3C]/20 px-4 py-4">
              <h2 className="font-serif text-base font-semibold text-[#2F271C]">
                {title}
              </h2>

              <p className="mt-0.5 text-xs text-[#6F7358]">
                {lessons.length} session{lessons.length === 1 ? "" : "s"}
              </p>
            </div>

            <ol className="max-h-[32rem] overflow-y-auto p-2">
              {lessons.map((lesson, index) => {
                const isActive = index === activeIndex
                const thumb = videoThumbnail(lesson, "mq")

                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => select(lesson.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "flex w-full gap-3 rounded-xl p-2 text-left transition",
                        isActive
                          ? "bg-[#E8DDC8] ring-1 ring-[#C89B3C]/40"
                          : "hover:bg-[#E8DDC8]/60"
                      )}
                    >
                      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-[#E8DDC8]">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Video className="size-4 text-[#8A6A22]" />
                          </div>
                        )}

                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                            <div className="flex size-6 items-center justify-center rounded-full bg-[#D4A936] text-[#2F271C]">
                              <Play className="size-3 fill-current" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "line-clamp-2 text-[13px] font-semibold leading-snug",
                            isActive ? "text-[#8A6A22]" : "text-[#2F271C]"
                          )}
                        >
                          {lesson.title}
                        </p>

                        <p className="mt-1 text-[11px] text-[#6F7358]">
                          {new Date(lesson.created_at).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short", year: "numeric" }
                          )}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}

function AboutTab({
  lesson,
}: {
  lesson: VideoSummary
}) {
  const hasKeyPoints = (lesson.key_points?.length ?? 0) > 0
  const hasActions = (lesson.action_items?.length ?? 0) > 0
  const hasAnything =
    lesson.one_line_takeaway || lesson.full_summary || hasKeyPoints || hasActions

  if (!hasAnything) {
    return <EmptyNote>No notes for this session yet.</EmptyNote>
  }

  return (
    <div className="space-y-5">
      {lesson.one_line_takeaway && (
        <p className="text-sm font-medium leading-6 text-[#4B3A25]">
          {lesson.one_line_takeaway}
        </p>
      )}

      {hasKeyPoints && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#2F271C]">
            Key points
          </h3>

          <ul className="space-y-2">
            {lesson.key_points!.map((kp, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-6 text-[#4B3A25]"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#C89B3C]" />
                <span>
                  {kp.point}
                  {kp.timestamp && (
                    <span className="ml-2 text-xs text-[#6F7358]">
                      {kp.timestamp}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasActions && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#2F271C]">
            Practice actions
          </h3>

          <ol className="space-y-2">
            {lesson.action_items!.map((action, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-sm leading-6 text-[#4B3A25]"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#C89B3C]/15 text-[11px] font-bold text-[#8A6A22]">
                  {i + 1}
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {lesson.full_summary && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#2F271C]">Summary</h3>

          <div className="whitespace-pre-line text-sm leading-7 text-[#6F7358]">
            {lesson.full_summary}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#C89B3C]/30 px-4 py-6 text-sm text-[#6F7358]">
      <FileText className="size-4 shrink-0 text-[#C89B3C]" />
      {children}
    </div>
  )
}
