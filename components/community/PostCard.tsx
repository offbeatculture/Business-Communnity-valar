"use client"

import Link from "next/link"
import { Pin, MessageCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { PostWithAuthor } from "@/types"
import { LikeButton } from "./LikeButton"
import { SaveButton } from "./SaveButton"
import { PostActions } from "./PostActions"

const categoryConfig: Record<string, { label: string; className: string }> = {
  win: { label: "Win", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  question: { label: "Question", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  discussion: { label: "Discussion", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  introduction: { label: "Introduction", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
}

interface PostCardProps {
  post: PostWithAuthor
  currentUserId: string
  userRole: "member" | "admin"
  isLiked: boolean
  isSaved: boolean
  fullContent?: boolean
}

export function PostCard({
  post,
  currentUserId,
  userRole,
  isLiked,
  isSaved,
  fullContent = false,
}: PostCardProps) {
  const isOwner = post.user_id === currentUserId
  const isAdmin = userRole === "admin"
  const authorName = post.profiles?.full_name ?? "Anonymous"
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
  })

  const shouldTruncate = !fullContent && post.content.length > 280
  const displayContent = shouldTruncate
    ? post.content.slice(0, 280) + "..."
    : post.content

  const cat = categoryConfig[post.category]

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm active:bg-accent/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar size="default">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              {post.profiles?.id ? (
                <Link
                  href={`/members/${post.profiles.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {authorName}
                </Link>
              ) : (
                <span className="text-sm font-medium">{authorName}</span>
              )}
              {/*
                TODO(phase6-followup): Render a small TierBadge next to the
                author name once `tier` is joined into the posts query in
                lib/community.ts. Skipped in the Phase 6 polish pass because
                the join touches fetchPosts, the PostWithAuthor type, and the
                saved/profile feed loaders — out of scope for an accent.
              */}
              {post.is_pinned && <Pin size={14} className="text-primary" />}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{timeAgo}</span>
              <Badge variant="outline" className={cat.className}>
                {cat.label}
              </Badge>
            </div>
          </div>
        </div>
        <PostActions
          postId={post.id}
          isOwner={isOwner}
          isAdmin={isAdmin}
          isPinned={post.is_pinned}
        />
      </div>

      {/* Prompt context */}
      {post.daily_prompts?.prompt_text && (
        <div className="mb-3 pl-3 border-l-2 border-primary/40">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Daily Prompt</p>
          <p className="text-sm text-muted-foreground/80">{post.daily_prompts.prompt_text}</p>
        </div>
      )}

      {/* Content */}
      <div className="mb-3">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {displayContent}
        </p>
        {shouldTruncate && (
          <Link
            href={`/community/${post.id}`}
            className="text-sm text-primary hover:underline"
          >
            Read more
          </Link>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1">
          <LikeButton
            postId={post.id}
            initialLiked={isLiked}
            initialCount={post.like_count}
          />
          <Link
            href={`/community/${post.id}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] justify-center"
          >
            <MessageCircle size={18} />
            <span>{post.comment_count > 0 ? post.comment_count : ""}</span>
          </Link>
        </div>
        <SaveButton postId={post.id} initialSaved={isSaved} />
      </div>
    </div>
  )
}
