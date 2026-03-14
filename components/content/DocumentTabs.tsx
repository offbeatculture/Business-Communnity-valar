"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, Lightbulb } from "lucide-react"
import type { ResourceDocument } from "@/types"

type Props = {
  resourceId: string
  documents: ResourceDocument[]
}

export function DocumentTabs({ resourceId, documents }: Props) {
  const defaultTab = documents[0]?.id ?? ""

  return (
    <div>
      {documents.length >= 2 && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-0">
            <Lightbulb className="size-5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm font-medium">
              Start with the Diagnostic to find gaps, then use the Guide to fix them.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList variant="line" className="mb-4 overflow-x-auto">
          {documents.map((doc) => (
            <TabsTrigger key={doc.id} value={doc.id}>
              {doc.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {documents.map((doc) => {
          const isHtml = doc.file_url.endsWith(".html")
          return (
            <TabsContent key={doc.id} value={doc.id}>
              <div className="mb-4">
                <a href={`/api/content/${resourceId}/download/${doc.id}`}>
                  <Button>
                    <Download className="size-4 mr-2" />
                    Download {doc.label}
                  </Button>
                </a>
              </div>

              {isHtml && (
                <iframe
                  src={`/api/content/${resourceId}/render/${doc.id}`}
                  sandbox="allow-scripts allow-same-origin"
                  className="w-full rounded-lg border"
                  style={{ minHeight: "70vh" }}
                  title={doc.label}
                />
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
