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
    label: "Practice Guides",
    description: "Breathwork guides",
    icon: BookOpen,
  },
  {
    value: "template",
    label: "Worksheets",
    description: "Practice tools",
    icon: FileText,
  },
  {
    value: "video_summary",
    label: "Session Videos",
    description: "Recordings",
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A6A22]" />

        <Input
          placeholder="Search breathwork resources..."
          value={searchValue}
          className="h-11 rounded-2xl border-[#C89B3C]/25 bg-[#F7F0E3] pl-10 pr-10 text-sm text-[#4B3A25] shadow-sm placeholder:text-[#6F7358]/70 focus-visible:ring-[#C89B3C]"
          onChange={(e) => setSearchValue(e.target.value)}
        />

        {searchValue && (
          <button
            type="button"
            onClick={() => setSearchValue("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[#E8DDC8] px-2 py-1 text-[11px] text-[#6F7358] hover:text-[#4B3A25]"
          >
            Clear
          </button>
        )}
      </div>

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
                    ? "border-[#C89B3C]/45 bg-[#F7F0E3] shadow-sm shadow-black/5"
                    : "border-[#C89B3C]/20 bg-[#F7F0E3]/70 hover:border-[#C89B3C]/40 hover:bg-[#F7F0E3]"
                }`}
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                    isActive
                      ? "bg-[#C89B3C] text-[#122015]"
                      : "bg-[#E8DDC8] text-[#6F7358]"
                  }`}
                >
                  <Icon className="size-4" />
                </div>

                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-semibold ${
                      isActive ? "text-[#8A6A22]" : "text-[#4B3A25]"
                    }`}
                  >
                    {item.label}
                  </p>

                  <p className="truncate text-[11px] text-[#6F7358]">
                    {item.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          <button
            type="button"
            onClick={() => updateParams("category", "all")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${
              currentCategory === "all"
                ? "border-[#C89B3C]/50 bg-[#C89B3C] text-[#122015]"
                : "border-[#C89B3C]/25 bg-[#F7F0E3] text-[#6F7358] hover:bg-[#E8DDC8] hover:text-[#4B3A25]"
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
                    ? "border-[#C89B3C]/50 bg-[#C89B3C] text-[#122015]"
                    : "border-[#C89B3C]/25 bg-[#F7F0E3] text-[#6F7358] hover:bg-[#E8DDC8] hover:text-[#4B3A25]"
                }`}
              >
                <Folder className="size-3.5" />
                {category.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#C89B3C]/20 bg-[#F7F0E3] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm text-[#6F7358]">
          <SlidersHorizontal className="size-4 shrink-0 text-[#8A6A22]" />
          <span className="truncate">{activeCategoryLabel}</span>
        </div>

        <Select
          value={currentSort}
          onValueChange={(v) => updateParams("sort", v)}
        >
          <SelectTrigger className="h-9 w-[118px] rounded-xl border-[#C89B3C]/25 bg-[#E8DDC8] text-xs text-[#4B3A25] focus:ring-[#C89B3C]">
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