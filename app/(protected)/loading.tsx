import { Skeleton } from "@/components/ui/skeleton"

export default function ProtectedLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="space-y-4 w-full max-w-md">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
        <div className="flex justify-center pt-4">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  )
}
