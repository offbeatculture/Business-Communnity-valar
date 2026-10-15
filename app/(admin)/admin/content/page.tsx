"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VideoSummaryForm } from "@/components/admin/VideoSummaryForm"
import { BulkVideoForm } from "@/components/admin/BulkVideoForm"
import {
  FolderManager,
  type ContentFolder,
} from "@/components/admin/FolderManager"
import { AdminContentTable } from "@/components/admin/AdminContentTable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FolderCog, Loader2, Video } from "lucide-react"
import { toast } from "sonner"
import type { ContentItem, Category } from "@/types"

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [folders, setFolders] = useState<ContentFolder[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Every recording, drafts included. This used to read /api/content — the
  // member list — which is published-only and capped at 12 per page, so the
  // table only ever showed the 12 newest.
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/content/videos")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setItems(data.data ?? [])
    } catch {
      toast.error("Failed to load recordings")
    }
  }, [])

  // One folder list for the folder manager and the video table's
  // "Move to folder" picker, so they never disagree.
  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/content-folders")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFolders(data.data ?? [])
    } catch {
      toast.error("Failed to load folders")
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchItems(), fetchFolders()])
  }, [fetchItems, fetchFolders])

  useEffect(() => {
    async function loadAll() {
      try {
        const [catRes] = await Promise.all([
          fetch("/api/categories"),
          fetchItems(),
          fetchFolders(),
        ])

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
  }, [fetchItems, fetchFolders])

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
              {/* Both forms can create a folder on the way, so refresh both. */}
              <VideoSummaryForm
                categories={categories}
                onSuccess={refreshAll}
              />
            </TabsContent>

            <TabsContent value="bulk">
              <BulkVideoForm onSuccess={refreshAll} />
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
              <CardTitle>Folders ({folders.length})</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Rename a folder, set its cover, or tick several and move them
                inside another folder.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <FolderManager folders={folders} onChange={refreshAll} />
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
            folders={folders}
            onRefresh={refreshAll}
          />
        </CardContent>
      </Card>
    </div>
  )
}