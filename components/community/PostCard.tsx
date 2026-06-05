"use client"

import Link from "next/link"
import {
  CircleHelp,
  Hand,
  MessageCircle,
  Pin,
  Trophy,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { PostWithAuthor } from "@/types"
import { LikeButton } from "./LikeButton"
import { SaveButton } from "./SaveButton"
import { PostActions } from "./PostActions"

const categoryConfig: Record<
  string,
  {
    label: string
    icon: React.ElementType
    className: string
  }
> = {
  win: {
    label: "Win",
    icon: Trophy,
    className: "border-green-500/20 bg-green-500/10 text-green-500",
  },
  question: {
    label: "Question",
    icon: CircleHelp,
    className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600",
  },
  discussion: {
    label: "Discussion",
    icon: MessageCircle,
    className: "border-blue-500/20 bg-blue-500/10 text-blue-500",
  },
  introduction: {
    label: "Introduction",
    icon: Hand,
    className: "border-purple-500/20 bg-purple-500/10 text-purple-500",
  },
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

  const shouldTruncate = !fullContent && post.content.length > 360
  const displayContent = shouldTruncate
    ? `${post.content.slice(0, 360)}...`
    : post.content

  const cat = categoryConfig[post.category] ?? categoryConfig.discussion
  const CategoryIcon = cat.icon

  return (
    <article className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/25 hover:shadow-md hover:shadow-primary/5 active:bg-accent/30 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
              {initials || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {post.profiles?.id ? (
                <Link
                  href={`/members/${post.profiles.id}`}
                  className="truncate text-sm font-semibold hover:underline"
                >
                  {authorName}
                </Link>
              ) : (
                <span className="truncate text-sm font-semibold">
                  {authorName}
                </span>
              )}

              {post.is_pinned && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <Pin className="size-3" />
                  Pinned
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{timeAgo}</span>

              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cat.className}`}
              >
                <CategoryIcon className="size-3" />
                {cat.label}
              </span>
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
        <div className="mb-4 rounded-2xl border border-primary/15 bg-primary/[0.04] px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            Daily Prompt
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {post.daily_prompts.prompt_text}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="mb-4">
        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
          {displayContent}
        </p>

        {shouldTruncate && (
          <Link
            href={`/community/${post.id}`}
            className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Read more
          </Link>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border/60 pt-3">
        <div className="flex items-center gap-1">
          <LikeButton
            postId={post.id}
            initialLiked={isLiked}
            initialCount={post.like_count}
          />

          <Link
            href={`/community/${post.id}`}
            className="flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessageCircle className="size-[18px]" />
            <span>{post.comment_count > 0 ? post.comment_count : ""}</span>
          </Link>
        </div>

        <SaveButton postId={post.id} initialSaved={isSaved} />
      </div>
    </article>
  )
}