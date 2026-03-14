import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { fetchPostWithDetails } from "@/lib/community"
import { PostCard } from "@/components/community/PostCard"
import { CommentSection } from "@/components/community/CommentSection"

type Props = {
  params: Promise<{ id: string }>
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const userRole = (profile?.role ?? "member") as "member" | "admin"

  const details = await fetchPostWithDetails(id, user.id)

  if (!details) notFound()

  return (
    <div>
      <Link
        href="/community"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Community
      </Link>

      <div className="space-y-6">
        <PostCard
          post={details.post}
          currentUserId={user.id}
          userRole={userRole}
          isLiked={details.user_has_liked}
          isSaved={details.user_has_saved}
          fullContent
        />

        <CommentSection
          postId={id}
          initialComments={details.comments}
          currentUserId={user.id}
          userRole={userRole}
        />
      </div>
    </div>
  )
}
