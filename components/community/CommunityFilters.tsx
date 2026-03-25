"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const categoryTabs = [
  { value: "all", label: "All" },
  { value: "introduction", label: "Intros" },
  { value: "win", label: "Wins" },
  { value: "question", label: "Questions" },
  { value: "discussion", label: "Discussions" },
  { value: "mine", label: "My Posts" },
  { value: "saved", label: "Saved" },
]

export function CommunityFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeCategory = searchParams.get("category") ?? "all"
  const activeSort = searchParams.get("sort") ?? "newest"

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === "all" || (key === "sort" && value === "newest")) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      params.delete("page")
      router.push(`/community?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <Tabs
        value={activeCategory}
        onValueChange={(v) => updateParams("category", v)}
      >
        <TabsList className="w-full sm:w-auto">
          {categoryTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm px-1.5 sm:px-2">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Select
        value={activeSort}
        onValueChange={(v) => updateParams("sort", v)}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="popular">Most Liked</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
