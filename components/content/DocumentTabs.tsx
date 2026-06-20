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
      <div className="flex h-[300px] w-[220px] items-center justify-center overflow-hidden rounded-md border border-[#C89B3C]/25 bg-[#E8DDC8]">
        {loading && (
          <p className="text-xs text-[#6F7358]">Loading preview...</p>
        )}

        {error && (
          <p className="px-4 text-center text-xs text-[#6F7358]">
            Preview unavailable
          </p>
        )}

        <canvas
          ref={canvasRef}
          className={loading || error ? "hidden" : "max-h-full max-w-full"}
        />
      </div>
    </div>
  )
}

export function DocumentTabs({ resourceId, documents, userPlan }: Props) {
  const defaultTab = documents[0]?.id ?? ""

  return (
    <div className="text-[#4B3A25]">
      {documents.length >= 2 && (
        <Card className="mb-4 border-[#C89B3C]/25 bg-[#F7F0E3] text-[#4B3A25] shadow-sm shadow-black/5">
          <CardContent className="flex items-start gap-3 pt-4">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-[#C89B3C]" />
            <p className="text-sm font-medium">
              Start with the practice guide to understand the method, then use
              the worksheet to apply it in your daily breathwork routine.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList
          variant="line"
          className="mb-4 overflow-x-auto border-[#C89B3C]/20 bg-transparent"
        >
          {documents.map((doc) => (
            <TabsTrigger
              key={doc.id}
              value={doc.id}
              className="text-[#6F7358] data-[state=active]:text-[#8A6A22]"
            >
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
                  <Button disabled className="bg-[#E8DDC8] text-[#6F7358]">
                    <Lock className="mr-2 size-4" />
                    Upgrade to Download
                  </Button>
                ) : (
                  <a href={downloadUrl}>
                    <Button className="bg-[#C89B3C] font-semibold text-[#122015] hover:bg-[#D8B76A]">
                      <Download className="mr-2 size-4" />
                      Download {doc.label}
                    </Button>
                  </a>
                )}

                {canPreview && !isPdf && !isLocked && (
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      className="border-[#C89B3C]/30 bg-transparent text-[#8A6A22] hover:bg-[#C89B3C]/10 hover:text-[#4B3A25]"
                    >
                      <Eye className="mr-2 size-4" />
                      Open Preview
                    </Button>
                  </a>
                )}

                {isPdf && !isLocked && (
                  <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      className="border-[#C89B3C]/30 bg-transparent text-[#8A6A22] hover:bg-[#C89B3C]/10 hover:text-[#4B3A25]"
                    >
                      <Eye className="mr-2 size-4" />
                      Open PDF
                    </Button>
                  </a>
                )}

                {isLocked && (
                  <Button
                    variant="outline"
                    disabled
                    className="border-[#C89B3C]/20 bg-[#E8DDC8] text-[#6F7358]"
                  >
                    <Lock className="mr-2 size-4" />
                    Locked
                  </Button>
                )}
              </div>

              <div className="relative w-fit">
                <div
                  className={
                    isLocked ? "pointer-events-none select-none blur-sm" : ""
                  }
                >
                  <Card className="w-fit border-[#C89B3C]/20 bg-[#F7F0E3] text-[#4B3A25] shadow-sm shadow-black/5">
                    <CardContent className="p-4">
                      {isPdf && <PdfFirstPagePreview url={downloadUrl} />}

                      {isHtml && (
                        <div>
                          <div className="h-[300px] w-[320px] overflow-hidden rounded-md border border-[#C89B3C]/25 bg-[#E8DDC8]">
                            <iframe
                              src={previewUrl}
                              sandbox="allow-scripts allow-same-origin"
                              className="h-[420px] w-[460px] origin-top-left scale-[0.7] border-0"
                              title={`${doc.label} preview`}
                            />
                          </div>

                          <p className="mt-2 text-xs text-[#6F7358]">
                            HTML preview
                          </p>
                        </div>
                      )}

                      {isImage && (
                        <div>
                          <div className="flex h-[300px] w-[220px] items-center justify-center overflow-hidden rounded-md border border-[#C89B3C]/25 bg-[#E8DDC8]">
                            <img
                              src={previewUrl}
                              alt={doc.label}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>

                          <p className="mt-2 text-xs text-[#6F7358]">
                            Image preview
                          </p>
                        </div>
                      )}

                      {!canPreview && (
                        <div className="flex h-[220px] w-[280px] flex-col items-center justify-center gap-3 text-center">
                          <p className="text-sm font-medium text-[#4B3A25]">
                            Preview not available.
                          </p>

                          <p className="text-sm text-[#6F7358]">
                            Please download the file to view it.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#F7F0E3]/75 backdrop-blur-[2px]">
                    <div className="max-w-[220px] rounded-lg border border-[#C89B3C]/25 bg-[#F7F0E3] p-4 text-center shadow-sm">
                      <Lock className="mx-auto mb-2 size-5 text-[#6F7358]" />

                      <p className="text-sm font-semibold text-[#4B3A25]">
                        Premium content locked
                      </p>

                      <p className="mt-1 text-xs text-[#6F7358]">
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