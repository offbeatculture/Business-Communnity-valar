"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VideoSummaryForm } from "@/components/admin/VideoSummaryForm"
import { BulkVideoForm } from "@/components/admin/BulkVideoForm"
import { FolderManager } from "@/components/admin/FolderManager"
import { AdminContentTable } from "@/components/admin/AdminContentTable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FolderCog, Loader2, Video } from "lucide-react"
import type { ContentItem, Category } from "@/types"

// /api/content returns a mixed list and has labelled the video kind three
// different ways over time. This covers all three without reaching for `any`.
type MaybeVideoItem = {
  type?: string
  content_type?: string
  kind?: string
}

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/content")
      const data = await res.json()

      const allItems = data.data ?? []

      const videoItems = allItems.filter((item: MaybeVideoItem) => {
        return (
          item.type === "video_summary" ||
          item.content_type === "video_summary" ||
          item.kind === "video_summary"
        )
      })

      setItems(videoItems)
    } catch {
      console.error("Failed to fetch video content")
    }
  }, [])

  useEffect(() => {
    async function loadAll() {
      try {
        const [contentRes, catRes] = await Promise.all([
          fetch("/api/content"),
          fetch("/api/categories"),
        ])

        const contentData = await contentRes.json()
        const allItems = contentData.data ?? []

        const videoItems = allItems.filter((item: MaybeVideoItem) => {
          return (
            item.type === "video_summary" ||
            item.content_type === "video_summary" ||
            item.kind === "video_summary"
          )
        })

        setItems(videoItems)

        if (catRes.ok) {
          const catData = await catRes.json()
          setCategories(catData)
        }
      } catch {
        console.error("Failed to load admin video content data")
      } finally {
        setLoading(false)
      }
    }

    loadAll()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">Admin</p>
        <h1 className="mt-1 text-2xl font-bold">Video Content Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage Dr Valar&apos;s breathwork session videos, YouTube
          summaries, and recording resources.
        </p>
      </div>

      {/* Create Video Content */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Video className="size-5 text-primary" />
            </div>

            <div>
              <CardTitle>Add Videos</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Add one video with a full AI summary, or paste a batch of
                YouTube links to publish a whole month at once.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="single">
            <TabsList className="mb-5">
              <TabsTrigger value="single">One video</TabsTrigger>
              <TabsTrigger value="bulk">Multiple videos</TabsTrigger>
            </TabsList>

            <TabsContent value="single">
              <VideoSummaryForm
                categories={categories}
                onSuccess={fetchItems}
              />
            </TabsContent>

            <TabsContent value="bulk">
              <BulkVideoForm onSuccess={fetchItems} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Folders and cover images */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <FolderCog className="size-5 text-primary" />
            </div>

            <div>
              <CardTitle>Folders</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Rename a folder, write a description, and set the cover image
                members see in the library.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <FolderManager />
        </CardContent>
      </Card>

      {/* Video Table */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>All Videos ({items.length})</CardTitle>
        </CardHeader>

        <CardContent>
          <AdminContentTable
            items={items}
            categories={categories}
            onRefresh={fetchItems}
          />
        </CardContent>
      </Card>
    </div>
  )
}