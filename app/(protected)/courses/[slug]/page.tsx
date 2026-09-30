import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { fetchCourseBySlug } from "@/lib/courses"
import { PlaylistPlayer } from "@/components/content/PlaylistPlayer"
import { PlayerSkeleton } from "@/components/content/PlayerSkeleton"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const course = await fetchCourseBySlug(slug)

  if (!course) return { title: "Course not found" }

  return {
    title: course.title,
    description: course.description ?? undefined,
  }
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params
  const course = await fetchCourseBySlug(slug)

  if (!course) notFound()

  return (
    <div>
      {course.description && (
        <p className="mb-5 max-w-2xl text-sm leading-6 text-[#6F7358]">
          {course.description}
        </p>
      )}

      {/* PlaylistPlayer reads ?v= via useSearchParams, so it needs a Suspense
          boundary to keep the rest of the route statically renderable. */}
      <Suspense fallback={<PlayerSkeleton />}>
        <PlaylistPlayer
          title={course.title}
          items={course.lessons}
          backHref="/content"
          backLabel="Back to Breathwork Library"
          emptyTitle="No sessions in this course yet"
          emptyBody="Once sessions are added to this course, they will play here."
        />
      </Suspense>
    </div>
  )
}
