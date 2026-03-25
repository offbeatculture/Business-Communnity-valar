import { Card, CardContent } from "@/components/ui/card"

export default function PromptsLoading() {
  return (
    <div>
      <div className="h-8 w-48 bg-muted rounded animate-pulse mb-1" />
      <div className="h-4 w-80 bg-muted rounded animate-pulse mb-6" />

      <div className="h-10 w-full max-w-lg bg-muted rounded animate-pulse mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-8 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-24 bg-muted/50 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
