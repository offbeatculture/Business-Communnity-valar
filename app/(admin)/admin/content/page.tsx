"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheatSheetForm } from "@/components/admin/CheatSheetForm"
import { TemplateForm } from "@/components/admin/TemplateForm"
import { VideoSummaryForm } from "@/components/admin/VideoSummaryForm"
import { AdminContentTable } from "@/components/admin/AdminContentTable"
import { Loader2 } from "lucide-react"
import type { ContentItem, Category } from "@/types"

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/content")
      const data = await res.json()
      setItems(data.data ?? [])
    } catch {
      console.error("Failed to fetch content")
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
        setItems(contentData.data ?? [])

        if (catRes.ok) {
          const catData = await catRes.json()
          setCategories(catData)
        }
      } catch {
        console.error("Failed to load data")
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
    <div>
      <h1 className="text-2xl font-bold mb-1">Content Management</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Create and manage cheat sheets, templates, and AI-generated video summaries.
      </p>

      {/* Create Content */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cheat_sheet">
            <TabsList className="mb-4 overflow-x-auto w-full sm:w-auto">
              <TabsTrigger value="cheat_sheet">Cheat Sheet</TabsTrigger>
              <TabsTrigger value="template">Template</TabsTrigger>
              <TabsTrigger value="video_summary">Video Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="cheat_sheet">
              <CheatSheetForm
                categories={categories}
                onSuccess={fetchItems}
              />
            </TabsContent>

            <TabsContent value="template">
              <TemplateForm
                categories={categories}
                onSuccess={fetchItems}
              />
            </TabsContent>

            <TabsContent value="video_summary">
              <VideoSummaryForm
                categories={categories}
                onSuccess={fetchItems}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Content ({items.length})</CardTitle>
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
