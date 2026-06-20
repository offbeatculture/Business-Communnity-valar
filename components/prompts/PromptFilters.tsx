"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Layers,
  Leaf,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react"
import { PROMPT_CATEGORIES } from "@/lib/prompt-categories"

const CATEGORY_META: Record<
  string,
  {
    label: string
    icon: React.ElementType
  }
> = {
  all: {
    label: "All",
    icon: Layers,
  },
  offer: {
    label: "Reflection",
    icon: Sparkles,
  },
  leads: {
    label: "Awareness",
    icon: Megaphone,
  },
  conversion: {
    label: "Balance",
    icon: BadgeDollarSign,
  },
  ops: {
    label: "Routine",
    icon: BriefcaseBusiness,
  },
  team: {
    label: "Community",
    icon: Users,
  },
  money: {
    label: "Grounding",
    icon: Leaf,
  },
  moat: {
    label: "Inner Safety",
    icon: ShieldCheck,
  },
  retention: {
    label: "Consistency",
    icon: Target,
  },
}

function getCategoryMeta(category: string) {
  return (
    CATEGORY_META[category] ?? {
      label: category,
      icon: Sparkles,
    }
  )
}

export function PromptFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentCategory = searchParams.get("category") ?? "all"
  const currentSearch = searchParams.get("q") ?? ""

  const [searchValue, setSearchValue] = useState(currentSearch)

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value === "all" || value.trim() === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }

      const query = params.toString()
      router.push(query ? `/prompts?${query}` : "/prompts")
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

  const categories = ["all", ...PROMPT_CATEGORIES]

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A6A22]" />

        <Input
          placeholder="Search practice prompts..."
          value={searchValue}
          className="h-11 rounded-2xl border-[#C89B3C]/25 bg-[#F7F0E3] pl-10 pr-10 text-sm text-[#4B3A25] shadow-sm placeholder:text-[#6F7358]/70 focus-visible:ring-[#C89B3C]"
          onChange={(e) => setSearchValue(e.target.value)}
        />

        {searchValue && (
          <button
            type="button"
            onClick={() => setSearchValue("")}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#E8DDC8] text-[#6F7358] hover:text-[#4B3A25]"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {categories.map((category) => {
            const meta = getCategoryMeta(category)
            const Icon = meta.icon
            const isActive = currentCategory === category

            return (
              <button
                key={category}
                type="button"
                onClick={() => updateParams("category", category)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium capitalize transition ${
                  isActive
                    ? "border-[#C89B3C]/50 bg-[#C89B3C] text-[#122015] shadow-sm shadow-black/10"
                    : "border-[#C89B3C]/25 bg-[#F7F0E3] text-[#6F7358] hover:border-[#C89B3C]/45 hover:bg-[#E8DDC8] hover:text-[#4B3A25]"
                }`}
              >
                <Icon className="size-3.5" />
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}