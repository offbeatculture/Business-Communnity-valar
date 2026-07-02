"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VideoSummaryForm } from "@/components/admin/VideoSummaryForm"
import { Loader2, Video } from "lucide-react"
import type { Category } from "@/types"

export function UploadRecordingClient() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories")

      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch {
      console.error("Failed to fetch categories")
    }
  }, [])

  useEffect(() => {
    async function loadAll() {
      await fetchCategories()
      setLoading(false)
    }

    loadAll()
  }, [fetchCategories])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Video className="size-5 text-primary" />
          </div>

          <div>
            <CardTitle>Upload Recording</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a YouTube URL, summary, key points, and assign the video to a
              folder.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <VideoSummaryForm
          categories={categories}
          onSuccess={fetchCategories}
        />
      </CardContent>
    </Card>
  )
}