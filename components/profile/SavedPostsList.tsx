"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PostCard } from "@/components/community/PostCard"
import { Bookmark, Loader2 } from "lucide-react"
import type { PostWithAuthor } from "@/types"

type Props = {
  initialPosts: PostWithAuthor[]
  initialHasMore: boolean
  currentUserId: string
  userRole: "member" | "admin"
}

export function SavedPostsList({
  initialPosts,
  initialHasMore,
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
      const res = await fetch(`/api/posts?category=saved&page=${nextPage}`)
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
      <div className="text-center py-8">
        <Bookmark className="size-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No saved posts yet</p>
        <p className="text-muted-foreground text-xs mt-1">
          Bookmark posts in the community to find them here.
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
          isLiked={false}
          isSaved={true}
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
