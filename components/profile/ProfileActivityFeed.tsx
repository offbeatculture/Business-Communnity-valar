"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PostCard } from "@/components/community/PostCard"
import { Loader2 } from "lucide-react"
import type { PostWithAuthor } from "@/types"

type Props = {
  initialPosts: PostWithAuthor[]
  initialHasMore: boolean
  userId: string
  currentUserId: string
  userRole: "member" | "admin"
}

export function ProfileActivityFeed({
  initialPosts,
  initialHasMore,
  userId,
  currentUserId,
  userRole,
}: Props) {
  const [posts, setPosts] = useState(initialPosts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    setLoading(true)
    try {
      const nextPage = page + 1
      const res = await fetch(`/api/posts?category=mine&page=${nextPage}`)
      if (!res.ok) return

      const data = await res.json()
      setPosts((prev) => [...prev, ...data.posts])
      setHasMore(data.hasMore)
      setPage(nextPage)
    } finally {
      setLoading(false)
    }
  }

  if (posts.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No posts yet.
      </p>
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
          isLiked={false}
          isSaved={false}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin mr-2" />}
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
