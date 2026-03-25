import { Skeleton } from "@/components/ui/skeleton"

export default function CommunityLoading() {
  return (
    <div>
      <Skeleton className="h-7 w-40 mb-1" />
      <Skeleton className="h-4 w-80 mb-6" />

      <div className="space-y-6">
        {/* Compose box skeleton */}
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-16 w-full rounded-md mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>

        {/* Filter tabs skeleton */}
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-md" />
          ))}
        </div>

        {/* 3 post card skeletons */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full ml-auto" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex gap-4 pt-1">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
