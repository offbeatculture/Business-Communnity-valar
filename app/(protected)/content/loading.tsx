import { Skeleton } from "@/components/ui/skeleton"

export default function ContentLoading() {
  return (
    <div>
      <Skeleton className="h-7 w-44 mb-1" />
      <Skeleton className="h-4 w-96 mb-6" />

      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-md" />
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
