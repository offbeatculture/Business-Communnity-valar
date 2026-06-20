"use client"

import Link from "next/link"
import {
  CircleHelp,
  Hand,
  MessageCircle,
  Pin,
  Sparkles,
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
    label: "Practice Win",
    icon: Sparkles,
    className: "border-[#C89B3C]/25 bg-[#C89B3C]/10 text-[#8A6A22]",
  },
  question: {
    label: "Question",
    icon: CircleHelp,
    className: "border-[#6F7358]/25 bg-[#6F7358]/10 text-[#4B3A25]",
  },
  discussion: {
    label: "Reflection",
    icon: MessageCircle,
    className: "border-[#C89B3C]/20 bg-[#F7F0E3] text-[#6F7358]",
  },
  introduction: {
    label: "Introduction",
    icon: Hand,
    className: "border-[#1F2A1B]/20 bg-[#1F2A1B]/10 text-[#1F2A1B]",
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
    <article className="rounded-3xl border border-[#C89B3C]/20 bg-[#F7F0E3] p-4 text-[#4B3A25] shadow-sm shadow-black/5 transition-all duration-200 hover:border-[#C89B3C]/35 hover:shadow-md hover:shadow-black/10 active:bg-[#E8DDC8] sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="size-10 shrink-0 border border-[#C89B3C]/25">
            <AvatarFallback className="bg-[#C89B3C]/10 text-xs font-medium text-[#8A6A22]">
              {initials || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {post.profiles?.id ? (
                <Link
                  href={`/members/${post.profiles.id}`}
                  className="truncate text-sm font-semibold text-[#4B3A25] hover:text-[#8A6A22] hover:underline"
                >
                  {authorName}
                </Link>
              ) : (
                <span className="truncate text-sm font-semibold text-[#4B3A25]">
                  {authorName}
                </span>
              )}

              {post.is_pinned && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#C89B3C]/25 bg-[#C89B3C]/10 px-2 py-0.5 text-[10px] font-medium text-[#8A6A22]">
                  <Pin className="size-3" />
                  Pinned
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#6F7358]">{timeAgo}</span>

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

      {post.daily_prompts?.prompt_text && (
        <div className="mb-4 rounded-2xl border border-[#C89B3C]/20 bg-[#E8DDC8]/70 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A6A22]">
            Daily Practice Prompt
          </p>

          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#6F7358]">
            {post.daily_prompts.prompt_text}
          </p>
        </div>
      )}

      <div className="mb-4">
        <p className="whitespace-pre-wrap text-sm leading-7 text-[#4B3A25]/90">
          {displayContent}
        </p>

        {shouldTruncate && (
          <Link
            href={`/community/${post.id}`}
            className="mt-2 inline-flex text-sm font-medium text-[#8A6A22] hover:underline"
          >
            Read more
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[#C89B3C]/20 pt-3">
        <div className="flex items-center gap-1">
          <LikeButton
            postId={post.id}
            initialLiked={isLiked}
            initialCount={post.like_count}
          />

          <Link
            href={`/community/${post.id}`}
            className="flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full text-sm text-[#6F7358] transition-colors hover:bg-[#C89B3C]/10 hover:text-[#8A6A22]"
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