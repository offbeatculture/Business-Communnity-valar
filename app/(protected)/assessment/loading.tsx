import { Card, CardContent } from "@/components/ui/card"

export default function AssessmentLoading() {
  return (
    <div className="max-w-xl mx-auto">
      <div className="h-8 w-56 bg-muted rounded animate-pulse mb-1" />
      <div className="h-4 w-80 bg-muted rounded animate-pulse mb-6" />

      <div className="h-2 bg-muted rounded-full animate-pulse mb-6" />

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-10 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
