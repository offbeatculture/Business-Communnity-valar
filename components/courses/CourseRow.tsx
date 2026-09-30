import Link from "next/link"
import { ArrowRight, Layers, Play } from "lucide-react"
import type { Course } from "@/types"

type CourseCard = Course & {
  lessonCount: number
  /** First lesson's thumbnail, used when the course has no cover of its own. */
  fallbackThumbnail: string | null
}

/**
 * Courses shown above the monthly folders on the library page.
 *
 * Renders nothing when there are no courses, so the library looks exactly as it
 * did before any course existed.
 */
export function CourseRow({ courses }: { courses: CourseCard[] }) {
  if (courses.length === 0) return null

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-serif text-xl font-semibold text-[#4B3A25]">
          Courses
        </h2>

        <p className="text-sm leading-6 text-[#6F7358]">
          Guided series you can watch straight through.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const cover = course.thumbnail_url ?? course.fallbackThumbnail

          return (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="group block"
            >
              <article className="space-y-3">
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#E8DDC8] shadow-sm ring-1 ring-[#C89B3C]/15 transition group-hover:shadow-md">
                  {cover ? (
                    <img
                      src={cover}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F7F0E3] to-[#E8DDC8]">
                      <Layers className="size-14 text-[#8A6A22]" />
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/20">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#D4A936] text-[#2F271C] shadow-lg transition group-hover:scale-105">
                      <Play className="size-5 fill-current" />
                    </div>
                  </div>

                  <div className="absolute left-2 top-2 rounded-md bg-[#102719]/85 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#F7ECD7]">
                    Course
                  </div>

                  <div className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-1 text-[11px] font-medium text-white">
                    {course.lessonCount} session
                    {course.lessonCount === 1 ? "" : "s"}
                  </div>
                </div>

                <div>
                  <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#2F271C] group-hover:text-[#8A6A22]">
                    {course.title}
                  </h3>

                  {course.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6F7358]">
                      {course.description}
                    </p>
                  )}

                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#8A6A22]">
                    Start watching
                    <ArrowRight className="size-3.5" />
                  </div>
                </div>
              </article>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
