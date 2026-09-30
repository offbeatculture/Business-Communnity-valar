import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { fetchCourseBySlug } from "@/lib/courses"
import { CoursePlayer } from "@/components/courses/CoursePlayer"

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

      {/* CoursePlayer reads ?v= via useSearchParams, so it needs a Suspense
          boundary to keep the rest of the route statically renderable. */}
      <Suspense fallback={<PlayerSkeleton />}>
        <CoursePlayer course={course} />
      </Suspense>
    </div>
  )
}

function PlayerSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <div className="aspect-video animate-pulse rounded-2xl bg-[#E8DDC8]" />
        <div className="h-40 animate-pulse rounded-2xl bg-[#F7F0E3]" />
      </div>

      <div className="h-[28rem] animate-pulse rounded-2xl bg-[#F7F0E3]" />
    </div>
  )
}
