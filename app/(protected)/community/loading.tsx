import { Card, CardContent } from "@/components/ui/card"

export default function CommunityLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="h-8 w-40 bg-muted rounded mb-4 animate-pulse" />
      {/* ComposeBox skeleton */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="h-20 bg-muted rounded mb-3 animate-pulse" />
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
      {/* Post skeletons */}
      {[1, 2, 3, 4, 5].map(i => (
        <Card key={i} className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 bg-muted rounded-full animate-pulse" />
              <div>
                <div className="h-4 w-28 bg-muted rounded mb-1 animate-pulse" />
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 mb-3">
              <div className="h-3 w-full bg-muted rounded animate-pulse" />
              <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex gap-4 pt-3 border-t border-border">
              <div className="h-5 w-12 bg-muted rounded animate-pulse" />
              <div className="h-5 w-12 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
