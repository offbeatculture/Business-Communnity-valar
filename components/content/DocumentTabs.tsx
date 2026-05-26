"use client"

import { useEffect, useRef, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, Lightbulb, Eye, Lock } from "lucide-react"
import type { ResourceDocument } from "@/types"

type Props = {
  resourceId: string
  documents: ResourceDocument[]
  userPlan?: string | null
}

function PdfFirstPagePreview({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function renderPdf() {
      try {
        setLoading(true)
        setError(false)

        const pdfjs = await import("pdfjs-dist")

        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString()

        const response = await fetch(url, {
          credentials: "same-origin",
        })

        if (!response.ok) {
          throw new Error("Failed to load PDF")
        }

        const arrayBuffer = await response.arrayBuffer()

        const pdf = await pdfjs.getDocument({
          data: arrayBuffer,
        }).promise

        const page = await pdf.getPage(1)

        const canvas = canvasRef.current
        if (!canvas || cancelled) return

        const viewport = page.getViewport({ scale: 0.45 })
        const context = canvas.getContext("2d")

        if (!context) return

        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise

        if (!cancelled) {
          setLoading(false)
        }
      } catch (err) {
        console.error("PDF preview error:", err)

        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    renderPdf()

    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <div>
      <div className="flex h-[300px] w-[220px] items-center justify-center overflow-hidden rounded-md border bg-muted">
        {loading && (
          <p className="text-xs text-muted-foreground">Loading preview...</p>
        )}

        {error && (
          <p className="px-4 text-center text-xs text-muted-foreground">
            Preview unavailable
          </p>
        )}

        <canvas
          ref={canvasRef}
          className={loading || error ? "hidden" : "max-h-full max-w-full"}
        />
      </div>

      {/* <p className="mt-2 text-xs text-muted-foreground">First page preview</p> */}
    </div>
  )
}

export function DocumentTabs({ resourceId, documents, userPlan }: Props) {
  const defaultTab = documents[0]?.id ?? ""

  return (
    <div>
      {documents.length >= 2 && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-4">
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
          const fileUrl = doc.file_url.toLowerCase()

          const isHtml = fileUrl.endsWith(".html")
          const isPdf = fileUrl.endsWith(".pdf")
          const isImage =
            fileUrl.endsWith(".png") ||
            fileUrl.endsWith(".jpg") ||
            fileUrl.endsWith(".jpeg") ||
            fileUrl.endsWith(".webp")

          const canPreview = isHtml || isPdf || isImage

          const normalizedLabel = doc.label.toLowerCase()

          const requiresPremium =
            normalizedLabel.includes("x factor") ||
            normalizedLabel.includes("xfactor") ||
            normalizedLabel.includes("business definition") ||
            normalizedLabel.includes("business defenition")

          const isLocked = requiresPremium && userPlan !== "1499"

          const downloadUrl = `/api/content/${resourceId}/download/${doc.id}`
          const previewUrl = `/api/content/${resourceId}/render/${doc.id}`

          return (
            <TabsContent key={doc.id} value={doc.id}>
              <div className="mb-4 flex flex-wrap gap-3">
                {isLocked ? (
                  <Button disabled>
                    <Lock className="size-4 mr-2" />
                    Upgrade to Download
                  </Button>
                ) : (
                  <a href={downloadUrl}>
                    <Button>
                      <Download className="size-4 mr-2" />
                      Download {doc.label}
                    </Button>
                  </a>
                )}

                {canPreview && !isPdf && !isLocked && (
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      <Eye className="size-4 mr-2" />
                      Open Preview
                    </Button>
                  </a>
                )}

                {isPdf && !isLocked && (
                  <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      <Eye className="size-4 mr-2" />
                      Open PDF
                    </Button>
                  </a>
                )}

                {isLocked && (
                  <Button variant="outline" disabled>
                    <Lock className="size-4 mr-2" />
                    Locked
                  </Button>
                )}
              </div>

              <div className="relative w-fit">
                <div className={isLocked ? "pointer-events-none select-none blur-sm" : ""}>
                  <Card className="w-fit">
                    <CardContent className="p-4">
                      {isPdf && <PdfFirstPagePreview url={downloadUrl} />}

                      {isHtml && (
                        <div>
                          <div className="h-[300px] w-[320px] overflow-hidden rounded-md border bg-background">
                            <iframe
                              src={previewUrl}
                              sandbox="allow-scripts allow-same-origin"
                              className="h-[420px] w-[460px] origin-top-left scale-[0.7] border-0"
                              title={`${doc.label} preview`}
                            />
                          </div>

                          <p className="mt-2 text-xs text-muted-foreground">
                            HTML preview
                          </p>
                        </div>
                      )}

                      {isImage && (
                        <div>
                          <div className="flex h-[300px] w-[220px] items-center justify-center overflow-hidden rounded-md border bg-muted">
                            <img
                              src={previewUrl}
                              alt={doc.label}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>

                          <p className="mt-2 text-xs text-muted-foreground">
                            Image preview
                          </p>
                        </div>
                      )}

                      {!canPreview && (
                        <div className="flex h-[220px] w-[280px] flex-col items-center justify-center gap-3 text-center">
                          <p className="text-sm font-medium">Preview not available.</p>
                          <p className="text-sm text-muted-foreground">
                            Please download the file to view it.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[2px]">
                    <div className="max-w-[220px] rounded-lg border bg-background p-4 text-center shadow-sm">
                      <Lock className="mx-auto mb-2 size-5 text-muted-foreground" />
                      <p className="text-sm font-semibold">Premium content locked</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Upgrade to ₹1499 plan to access this document.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}