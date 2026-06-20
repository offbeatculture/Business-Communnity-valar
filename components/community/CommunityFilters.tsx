"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bookmark,
  CircleHelp,
  Hand,
  Layers,
  Leaf,
  MessageCircle,
  Sparkles,
  UserCircle,
} from "lucide-react"

const categoryTabs = [
  { value: "all", label: "All", icon: Layers },
  { value: "introduction", label: "Introductions", icon: Hand },
  { value: "win", label: "Practice Wins", icon: Sparkles },
  { value: "question", label: "Questions", icon: CircleHelp },
  { value: "discussion", label: "Reflections", icon: MessageCircle },
  { value: "mine", label: "My Posts", icon: UserCircle },
  { value: "saved", label: "Saved", icon: Bookmark },
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

      const query = params.toString()
      router.push(query ? `/community?${query}` : "/community")
    },
    [router, searchParams]
  )

  return (
    <div className="space-y-3">
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {categoryTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeCategory === tab.value

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => updateParams("category", tab.value)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? "border-[#C89B3C]/50 bg-[#C89B3C] text-[#122015] shadow-sm shadow-black/10"
                    : "border-[#C89B3C]/20 bg-[#F7F0E3] text-[#6F7358] hover:border-[#C89B3C]/45 hover:text-[#4B3A25]"
                }`}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#C89B3C]/20 bg-[#F7F0E3] px-3 py-2">
        <span className="flex items-center gap-2 text-sm text-[#6F7358]">
          <Leaf className="size-4 text-[#C89B3C]" />
          Sort reflections
        </span>

        <Select
          value={activeSort}
          onValueChange={(v) => updateParams("sort", v)}
        >
          <SelectTrigger className="h-9 w-[135px] rounded-xl border-[#C89B3C]/25 bg-[#E8DDC8] text-xs text-[#4B3A25] focus:ring-[#C89B3C]">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Liked</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}