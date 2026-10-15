"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VideoSummaryForm } from "@/components/admin/VideoSummaryForm"
import { BulkVideoForm } from "@/components/admin/BulkVideoForm"
import {
  FolderManager,
  type ContentFolder,
} from "@/components/admin/FolderManager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FolderCog, Loader2, Video } from "lucide-react"
import { toast } from "sonner"
import type { Category } from "@/types"

export function UploadRecordingClient() {
  const [categories, setCategories] = useState<Category[]>([])
  const [folders, setFolders] = useState<ContentFolder[]>([])
  const [loading, setLoading] = useState(true)

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
      await Promise.all([fetchCategories(), fetchFolders()])
      setLoading(false)
    }

    loadAll()
  }, [fetchCategories, fetchFolders])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Video className="size-5 text-primary" />
            </div>

            <div>
              <CardTitle>Upload Recordings</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Add one recording with a full AI summary, or paste a batch of
                YouTube links to publish a whole month at once.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="single">
            <TabsList className="mb-5">
              <TabsTrigger value="single">One recording</TabsTrigger>
              <TabsTrigger value="bulk">Multiple recordings</TabsTrigger>
            </TabsList>

            <TabsContent value="single">
              {/* Either form can create a folder, so the list below refreshes. */}
              <VideoSummaryForm
                categories={categories}
                onSuccess={() => {
                  fetchCategories()
                  fetchFolders()
                }}
              />
            </TabsContent>

            <TabsContent value="bulk">
              <BulkVideoForm onSuccess={fetchFolders} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
          <FolderManager folders={folders} onChange={fetchFolders} />
        </CardContent>
      </Card>
    </div>
  )
}