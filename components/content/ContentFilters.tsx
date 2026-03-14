"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search } from "lucide-react"
import type { Category } from "@/types"

type Props = {
  categories: Category[]
}

export function ContentFilters({ categories }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentType = searchParams.get("type") ?? "all"
  const currentCategory = searchParams.get("category") ?? "all"
  const currentSort = searchParams.get("sort") ?? "newest"
  const currentSearch = searchParams.get("q") ?? ""

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === "all" || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      // Reset to page 1 on filter change
      params.delete("page")
      router.push(`/content?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="space-y-4">
      {/* Type tabs */}
      <Tabs value={currentType} onValueChange={(v) => updateParams("type", v)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm px-1.5 sm:px-2">All</TabsTrigger>
          <TabsTrigger value="cheat_sheet" className="text-xs sm:text-sm px-1.5 sm:px-2">Cheat Sheets</TabsTrigger>
          <TabsTrigger value="template" className="text-xs sm:text-sm px-1.5 sm:px-2">Templates</TabsTrigger>
          <TabsTrigger value="video_summary" className="text-xs sm:text-sm px-1.5 sm:px-2">Video Summaries</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + Category + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            defaultValue={currentSearch}
            className="pl-9"
            onChange={(e) => {
              // Debounce: update after user stops typing
              const value = e.target.value
              const timeout = setTimeout(() => updateParams("q", value), 400)
              return () => clearTimeout(timeout)
            }}
          />
        </div>

        <Select
          value={currentCategory}
          onValueChange={(v) => updateParams("category", v)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentSort}
          onValueChange={(v) => updateParams("sort", v)}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Viewed</SelectItem>
            <SelectItem value="az">A — Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
