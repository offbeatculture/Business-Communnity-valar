"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search } from "lucide-react"
import { PROMPT_CATEGORIES } from "@/lib/prompt-categories"

export function PromptFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentCategory = searchParams.get("category") ?? "all"
  const currentSearch = searchParams.get("q") ?? ""

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === "all" || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      router.push(`/prompts?${params.toString()}`)
    },
    [router, searchParams],
  )

  return (
    <div className="space-y-4">
      <Tabs value={currentCategory} onValueChange={(v) => updateParams("category", v)}>
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs sm:text-sm px-1.5 sm:px-2">All</TabsTrigger>
          {PROMPT_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs sm:text-sm px-1.5 sm:px-2 capitalize">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search prompts..."
          defaultValue={currentSearch}
          className="pl-9"
          onChange={(e) => {
            const value = e.target.value
            const timeout = setTimeout(() => updateParams("q", value), 400)
            return () => clearTimeout(timeout)
          }}
        />
      </div>
    </div>
  )
}
