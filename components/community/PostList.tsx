"use client"

import { useEffect, useMemo, useState } from "react"
import { Bookmark, Loader2, MessageSquare, PlusCircle } from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PostCard } from "./PostCard"
import type { PostWithAuthor } from "@/types"

interface PostListProps {
  initialPosts: PostWithAuthor[]
  initialHasMore: boolean
  currentUserId: string
  userRole: "member" | "admin"
  likedIds: string[]
  savedIds: string[]
}

export function PostList({
  initialPosts,
  initialHasMore,
  currentUserId,
  userRole,
  likedIds: initialLikedIds,
  savedIds: initialSavedIds,
}: PostListProps) {
  const searchParams = useSearchParams()

  const [posts, setPosts] = useState(initialPosts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [likedSet, setLikedSet] = useState(() => new Set(initialLikedIds))
  const [savedSet, setSavedSet] = useState(() => new Set(initialSavedIds))

  useEffect(() => {
    setPosts(initialPosts)
    setHasMore(initialHasMore)
    setPage(1)
    setLikedSet(new Set(initialLikedIds))
    setSavedSet(new Set(initialSavedIds))
  }, [initialPosts, initialHasMore, initialLikedIds, initialSavedIds])

  async function loadMore() {
    if (loading || !hasMore) return

    setLoading(true)

    const nextPage = page + 1
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", nextPage.toString())

    try {
      const res = await fetch(`/api/posts?${params.toString()}`)
      if (!res.ok) throw new Error("Failed")

      const data = await res.json()

      setPosts((prev) => [...prev, ...data.posts])
      setHasMore(data.hasMore)
      setPage(nextPage)
    } catch {
      // User can retry
    } finally {
      setLoading(false)
    }
  }

  const activeFilter = searchParams.get("category")

  const emptyState = useMemo(() => {
    if (activeFilter === "mine") {
      return {
        icon: <MessageSquare className="size-8 text-[#C89B3C]" />,
        title: "You have not shared yet",
        description:
          "Share your first practice win, question, or reflection with the Daily Breathwork community.",
        ctaHref: "/community?compose=introduction",
        ctaLabel: "Create first reflection",
      }
    }

    if (activeFilter === "saved") {
      return {
        icon: <Bookmark className="size-8 text-[#C89B3C]" />,
        title: "No saved reflections yet",
        description:
          "Save useful reflections from other members and they will appear here for quick access.",
        ctaHref: "/community",
        ctaLabel: "Browse reflections",
      }
    }

    return {
      icon: <MessageSquare className="size-8 text-[#C89B3C]" />,
      title: "No reflections yet",
      description:
        "Be the first to share a practice win, ask a question, or start a reflection with the community.",
      ctaHref: "/community?compose=introduction",
      ctaLabel: "Start the first reflection",
    }
  }, [activeFilter])

  if (posts.length === 0) {
    return (
      <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-3xl border border-dashed border-[#C89B3C]/30 bg-[#F7F0E3]/70 px-6 py-12 text-center text-[#4B3A25]">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#C89B3C]/10">
          {emptyState.icon}
        </div>

        <h3 className="font-serif text-xl font-semibold text-[#4B3A25]">
          {emptyState.title}
        </h3>

        <p className="mt-1 max-w-sm text-sm leading-6 text-[#6F7358]">
          {emptyState.description}
        </p>

        <Link href={emptyState.ctaHref} className="mt-5">
          <Button
            size="sm"
            className="rounded-full bg-[#C89B3C] font-semibold text-[#122015] hover:bg-[#D8B76A]"
          >
            <PlusCircle className="mr-1.5 size-4" />
            {emptyState.ctaLabel}
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          userRole={userRole}
          isLiked={likedSet.has(post.id)}
          isSaved={savedSet.has(post.id)}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loading}
            className="h-10 rounded-full border-[#C89B3C]/30 bg-[#F7F0E3] px-5 font-medium text-[#8A6A22] hover:bg-[#E8DDC8] hover:text-[#4B3A25]"
          >
            {loading && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            {loading ? "Loading..." : "Load more reflections"}
          </Button>
        </div>
      )}
    </div>
  )
}