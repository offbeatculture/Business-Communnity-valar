import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Hero welcome card skeleton */}
      <div className="rounded-xl border border-border bg-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-64" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
        <Skeleton className="h-2 w-full rounded-full mt-4" />
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border/50">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton className="h-7 w-8 mx-auto" />
              <Skeleton className="h-3 w-14 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick action grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Posts + highlights */}
      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex gap-4 pt-1">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 lg:mt-0">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  )
}
