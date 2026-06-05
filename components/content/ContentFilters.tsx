"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BookOpen,
  FileText,
  Folder,
  Layers,
  Search,
  SlidersHorizontal,
  Video,
} from "lucide-react"
import type { Category } from "@/types"

type Props = {
  categories: Category[]
}

const TYPE_FILTERS = [
  {
    value: "all",
    label: "All",
    description: "Everything",
    icon: Layers,
  },
  {
    value: "cheat_sheet",
    label: "Cheat Sheets",
    description: "Quick guides",
    icon: BookOpen,
  },
  {
    value: "template",
    label: "Templates",
    description: "Ready to use",
    icon: FileText,
  },
  {
    value: "video_summary",
    label: "Videos",
    description: "Summaries",
    icon: Video,
  },
]

export function ContentFilters({ categories }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentType = searchParams.get("type") ?? "all"
  const currentCategory = searchParams.get("category") ?? "all"
  const currentSort = searchParams.get("sort") ?? "newest"
  const currentSearch = searchParams.get("q") ?? ""

  const [searchValue, setSearchValue] = useState(currentSearch)

  const activeCategoryLabel = useMemo(() => {
    if (currentCategory === "all") return "All Categories"
    return (
      categories.find((category) => category.slug === currentCategory)?.name ??
      "Category"
    )
  }, [categories, currentCategory])

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value === "all" || value.trim() === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }

      params.delete("page")

      const query = params.toString()
      router.push(query ? `/content?${query}` : "/content")
    },
    [router, searchParams]
  )

  useEffect(() => {
    setSearchValue(currentSearch)
  }, [currentSearch])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchValue !== currentSearch) {
        updateParams("q", searchValue)
      }
    }, 450)

    return () => clearTimeout(timeout)
  }, [searchValue, currentSearch, updateParams])

  return (
  <div className="space-y-3">
    {/* Compact search first */}
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

      <Input
        placeholder="Search resources..."
        value={searchValue}
        className="h-11 rounded-2xl border-border/70 bg-card pl-10 pr-10 text-sm shadow-sm"
        onChange={(e) => setSearchValue(e.target.value)}
      />

      {searchValue && (
        <button
          type="button"
          onClick={() => setSearchValue("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>

    {/* Type folders */}
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-2 sm:grid sm:min-w-0 sm:grid-cols-4">
        {TYPE_FILTERS.map((item) => {
          const Icon = item.icon
          const isActive = currentType === item.value

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => updateParams("type", item.value)}
              className={`flex w-[132px] shrink-0 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition sm:w-auto ${
                isActive
                  ? "border-primary/40 bg-primary/10 shadow-sm shadow-primary/10"
                  : "border-border/60 bg-card hover:border-primary/25 hover:bg-muted/40"
              }`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="size-4" />
              </div>

              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-semibold ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}
                >
                  {item.label}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>

    {/* Category chips */}
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-2">
        <button
          type="button"
          onClick={() => updateParams("category", "all")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${
            currentCategory === "all"
              ? "border-primary/40 bg-primary text-primary-foreground"
              : "border-border/70 bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <Folder className="size-3.5" />
          All
        </button>

        {categories.map((category) => {
          const isActive = currentCategory === category.slug

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => updateParams("category", category.slug)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${
                isActive
                  ? "border-primary/40 bg-primary text-primary-foreground"
                  : "border-border/70 bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Folder className="size-3.5" />
              {category.name}
            </button>
          )
        })}
      </div>
    </div>

    {/* Compact filter summary + sort */}
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-3 py-2">
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <SlidersHorizontal className="size-4 shrink-0" />
        <span className="truncate">{activeCategoryLabel}</span>
      </div>

      <Select
        value={currentSort}
        onValueChange={(v) => updateParams("sort", v)}
      >
        <SelectTrigger className="h-9 w-[118px] rounded-xl border-border/70 bg-background text-xs">
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