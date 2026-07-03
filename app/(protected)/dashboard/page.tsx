import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { fetchProfile, fetchProfileStats } from "@/lib/profile"
import { fetchPosts, fetchUserInteractions } from "@/lib/community"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardPostActions } from "@/components/community/DashboardPostActions"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  MessageSquare,
  PlayCircle,
  Trophy,
  Clock,
  // Heart,
  Video,
} from "lucide-react"

type DashboardRecording = {
  id: string
  title: string
  category: string
  duration: string
  description: string
  thumbnail: string | null
  href: string
  comingSoon?: false
}

type ComingSoonRecording = {
  id: string
  title: string
  category: string
  duration: string
  description: string
  thumbnail: null
  href: string
  comingSoon: true
}

type RecordingSlot = DashboardRecording | ComingSoonRecording
type LeaderboardMember = {
  rank: number
  userId: string
  name: string
  label: string
  points: number
  streak: string
}

type LeaderboardStats = {
  postCount: number
  commentCount: number
  likesReceived: number
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

    const [profile, stats, { posts }, latestRecordings, leaderboard] =
  await Promise.all([
    fetchProfile(user.id),
    fetchProfileStats(user.id),
    fetchPosts({ page: 1, perPage: 4 }),
    fetchLatestRecordings(supabase),
    fetchLeaderboard(supabase, user.id),
  ])

  // const [profile, stats, { posts }, latestRecordings] = await Promise.all([
  //   fetchProfile(user.id),
  //   fetchProfileStats(user.id),
  //   fetchPosts({ page: 1, perPage: 4 }),
  //   fetchLatestRecordings(supabase),
  // ])

  if (!profile) redirect("/profile")

  const postIds = posts.map((post) => post.id)
  const { likedIds, savedIds } = await fetchUserInteractions(user.id, postIds)

  const firstName = profile.full_name?.split(" ")[0] ?? "there"

  const recordings = buildRecordingSlots(latestRecordings)

  // const leaderboard = [
  //   {
  //     rank: 1,
  //     name: firstName,
  //     label: "You",
  //     points: stats.postCount * 10 + stats.commentCount * 5 + stats.likesReceived,
  //     streak: "Active",
  //   },
  //   {
  //     rank: 2,
  //     name: "Meera",
  //     label: "Member",
  //     points: 86,
  //     streak: "7 days",
  //   },
  //   {
  //     rank: 3,
  //     name: "Arjun",
  //     label: "Member",
  //     points: 72,
  //     streak: "5 days",
  //   },
  //   {
  //     rank: 4,
  //     name: "Kavya",
  //     label: "Member",
  //     points: 64,
  //     streak: "4 days",
  //   },
  // ]

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-24 sm:pb-10">
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-lg shadow-primary/5">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {(() => {
                  const h = new Date().getHours()
                  return h < 12
                    ? "Good morning"
                    : h < 17
                      ? "Good afternoon"
                      : "Good evening"
                })()}
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome back, {firstName}!
              </h1>

              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Continue your breathwork journey, check new community posts, and
                revisit the latest recordings from Dr Valar.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border/60 bg-background/50 p-3">
              <StatItem label="Posts" value={stats.postCount} />
              <StatItem label="Comments" value={stats.commentCount} />
              <StatItem label="Likes" value={stats.likesReceived} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-6">
          <section>
            <SectionHeader
              title="Community Posts"
              description="Latest conversations from the breathwork community."
              href="/community"
              action="View all"
            />

            {posts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {posts.map((post) => (
                  <DashboardPostCard
                    key={post.id}
                    post={post}
                    isLiked={likedIds.has(post.id)}
                    isSaved={savedIds.has(post.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-border/60">
                <CardContent className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <MessageSquare className="mb-3 size-9 text-muted-foreground" />
                  <h3 className="font-semibold">No community posts yet</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Be the first to share your breathwork experience or ask a
                    question.
                  </p>
                  <Link href="/community?compose=introduction" className="mt-4">
                    <Button>Start a Post</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <SectionHeader
              title="Latest Recordings"
              description="Continue with guided breathwork and healing sessions."
              href="/content"
              action="View recordings"
            />

            <div className="grid gap-4 md:grid-cols-3">
              {recordings.map((recording) => (
                <RecordingCard key={recording.id} recording={recording} />
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Card className="border-primary/15 bg-card shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                  <Trophy className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">Leaderboard</h2>
                  <p className="text-xs text-muted-foreground">
                    Active members this week
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {leaderboard.map((member) => (
                  <div
                    key={member.rank}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {member.rank}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.label} · {member.streak}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold">{member.points}</p>
                      <p className="text-[11px] text-muted-foreground">pts</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/community" className="mt-4 block">
                <Button variant="outline" className="w-full">
                  Open Community
                </Button>
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

async function fetchLeaderboard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  currentUserId: string
): Promise<LeaderboardMember[]> {
  const [profilesRes, postsRes, commentsRes, likesRes] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name"),
    supabase.from("posts").select("id, user_id"),
    supabase.from("comments").select("id, user_id"),
    supabase.from("likes").select("id, post_id"),
  ])

  if (profilesRes.error) console.error("Leaderboard profiles error:", profilesRes.error)
  if (postsRes.error) console.error("Leaderboard posts error:", postsRes.error)
  if (commentsRes.error) console.error("Leaderboard comments error:", commentsRes.error)
  if (likesRes.error) console.error("Leaderboard likes error:", likesRes.error)

  const profiles = profilesRes.data ?? []
  const posts = postsRes.data ?? []
  const comments = commentsRes.data ?? []
  const likes = likesRes.data ?? []

  const profileMap = new Map<string, string>()

  profiles.forEach((profile) => {
    if (profile.user_id) {
      profileMap.set(profile.user_id, profile.full_name || "Member")
    }
  })

  const postOwnerMap = new Map<string, string>()

  posts.forEach((post) => {
    if (post.id && post.user_id) {
      postOwnerMap.set(post.id, post.user_id)
    }
  })

  const statsMap = new Map<string, LeaderboardStats>()

  function ensureStats(userId: string) {
    if (!statsMap.has(userId)) {
      statsMap.set(userId, {
        postCount: 0,
        commentCount: 0,
        likesReceived: 0,
      })
    }

    return statsMap.get(userId)!
  }

  posts.forEach((post) => {
    if (post.user_id) {
      ensureStats(post.user_id).postCount += 1
    }
  })

  comments.forEach((comment) => {
    if (comment.user_id) {
      ensureStats(comment.user_id).commentCount += 1
    }
  })

  likes.forEach((like) => {
    if (!like.post_id) return

    const postOwnerId = postOwnerMap.get(like.post_id)

    if (postOwnerId) {
      ensureStats(postOwnerId).likesReceived += 1
    }
  })

  return Array.from(statsMap.entries())
    .map(([userId, memberStats]) => {
      const points =
        memberStats.postCount * 10 +
        memberStats.commentCount * 5 +
        memberStats.likesReceived

      return {
        rank: 0,
        userId,
        name: profileMap.get(userId) || "Member",
        label: userId === currentUserId ? "You" : "Member",
        points,
        streak: "Active",
      }
    })
    .filter((member) => member.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 4)
    .map((member, index) => ({
      ...member,
      rank: index + 1,
    }))
}
async function fetchLatestRecordings(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<DashboardRecording[]> {
  const { data, error } = await supabase
    .from("video_summaries")
    .select(
      "id, title, youtube_video_id, youtube_url, video_duration_minutes, one_line_takeaway, full_summary, created_at"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(3)

  if (error) {
    console.error("Dashboard recordings fetch error:", error)
    return []
  }

  return (data ?? []).map((video) => {
    const videoId =
      video.youtube_video_id || getYouTubeVideoId(video.youtube_url)

    return {
      id: video.id,
      title: video.title || "Session Recording",
      category: "Recording",
      duration: video.video_duration_minutes
        ? `${video.video_duration_minutes} min`
        : "Watch now",
      description:
        video.one_line_takeaway ||
        video.full_summary ||
        "Watch the latest guided breathwork session.",
      thumbnail: videoId
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : null,
      href: `/content/${video.id}`,
    }
  })
}

function buildRecordingSlots(recordings: DashboardRecording[]): RecordingSlot[] {
  const slots: RecordingSlot[] = [...recordings]

  while (slots.length < 3) {
    slots.push({
      id: `coming-soon-${slots.length + 1}`,
      title: "Coming Soon",
      category: "New Session",
      duration: "Soon",
      description: "A new guided breathwork recording will be added here shortly.",
      thumbnail: null,
      href: "/content",
      comingSoon: true,
    })
  }

  return slots
}

function getYouTubeVideoId(url?: string | null) {
  if (!url) return null

  try {
    const parsed = new URL(url)

    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null
    }

    if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com"
    ) {
      if (parsed.searchParams.has("v")) {
        return parsed.searchParams.get("v")
      }

      const match = parsed.pathname.match(/^\/(embed|shorts)\/([^/?]+)/)
      if (match) return match[2]
    }

    return null
  } catch {
    return null
  }
}

function SectionHeader({
  title,
  description,
  href,
  action,
}: {
  title: string
  description: string
  href: string
  action: string
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="border-l-2 border-primary pl-3 text-base font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <Link href={href}>
        <Button
          variant="outline"
          size="sm"
          className="border-primary/30 text-primary hover:bg-primary/10"
        >
          {action}
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </Link>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-xl bg-background/40 px-3 py-3 text-center">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function DashboardPostCard({
  post,
  isLiked,
  isSaved,
}: {
  post: any
  isLiked: boolean
  isSaved: boolean
}) {
  const authorName =
    post.author?.full_name ||
    post.profile?.full_name ||
    post.profiles?.full_name ||
    "Community Member"

  const content = post.content || post.body || post.message || "Community post"

  const createdAt = post.created_at
    ? new Date(post.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "Today"

  const likes = post.likes_count ?? post.like_count ?? post.likes ?? 0
  const comments = post.comments_count ?? post.comment_count ?? post.comments ?? 0

  return (
    <Card className="group h-full overflow-hidden border-border/60 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {authorName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{authorName}</p>
            <p className="text-xs text-muted-foreground">{createdAt}</p>
          </div>

          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            Community
          </span>
        </div>

        <p className="line-clamp-4 flex-1 text-sm leading-6 text-foreground/85">
          {content}
        </p>

        {/* <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Heart
                className={`size-4 ${
                  isLiked ? "fill-primary text-primary" : ""
                }`}
              />
              {likes}
            </span>

            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-4" />
              {comments}
            </span>
          </div>

          {isSaved && (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
              Saved
            </span>
          )}
        </div> */}
        <DashboardPostActions
  postId={post.id}
  initialLiked={isLiked}
  initialLikes={likes}
  comments={comments}
  isSaved={isSaved}
/>
      </CardContent>
    </Card>
  )
}

function RecordingCard({ recording }: { recording: RecordingSlot }) {
  return (
    <Card className="group overflow-hidden border-border/60 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
      <CardContent className="p-0">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-background">
          {recording.thumbnail ? (
            <img
              src={recording.thumbnail}
              alt={recording.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-card to-background">
              <Video className="size-10 text-primary" />
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="flex size-12 items-center justify-center rounded-full bg-background/85 shadow-sm transition group-hover:scale-105">
              <PlayCircle className="size-7 text-primary" />
            </div>
          </div>

          <div className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-1 text-[11px] font-medium text-white">
            {recording.comingSoon ? "Coming Soon" : recording.duration}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              {recording.category}
            </span>

            <h3 className="mt-3 line-clamp-2 text-sm font-semibold">
              {recording.title}
            </h3>

            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {recording.description}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {recording.duration}
            </span>

            {recording.comingSoon ? (
              <Button
                size="sm"
                variant="ghost"
                disabled
                className="h-8 px-2 text-muted-foreground"
              >
                Soon
              </Button>
            ) : (
              <Link href={recording.href}>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-primary">
                  Watch
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}