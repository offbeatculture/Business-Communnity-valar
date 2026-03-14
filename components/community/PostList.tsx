"use client"

import { useState, useEffect, useMemo } from "react"
import { MessageSquare, Bookmark, Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
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

  // Sync server props into client state on router.refresh()
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
        icon: <MessageSquare size={28} className="text-muted-foreground" />,
        title: "No posts yet",
        description: "You haven't shared anything yet. Start by posting a win, question, or discussion!",
      }
    }
    if (activeFilter === "saved") {
      return {
        icon: <Bookmark size={28} className="text-muted-foreground" />,
        title: "No saved posts",
        description: "Bookmark posts you want to come back to and they'll appear here.",
      }
    }
    return {
      icon: <MessageSquare size={28} className="text-muted-foreground" />,
      title: "No posts yet",
      description: "Be the first to share a win, ask a question, or start a discussion with the community!",
    }
  }, [activeFilter])

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          {emptyState.icon}
        </div>
        <h3 className="text-lg font-medium mb-1">{emptyState.title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {emptyState.description}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
          >
            {loading && <Loader2 className="size-4 animate-spin mr-1.5" />}
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
