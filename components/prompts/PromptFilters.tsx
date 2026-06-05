"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Layers,
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
    label: "Offer",
    icon: Target,
  },
  leads: {
    label: "Leads",
    icon: Megaphone,
  },
  conversion: {
    label: "Conversion",
    icon: BadgeDollarSign,
  },
  ops: {
    label: "Ops",
    icon: BriefcaseBusiness,
  },
  team: {
    label: "Team",
    icon: Users,
  },
  money: {
    label: "Money",
    icon: BadgeDollarSign,
  },
  moat: {
    label: "Moat",
    icon: ShieldCheck,
  },
  retention: {
    label: "Retention",
    icon: Sparkles,
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
      {/* Compact search first */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          placeholder="Search prompts..."
          value={searchValue}
          className="h-11 rounded-2xl border-border/70 bg-card pl-10 pr-10 text-sm shadow-sm"
          onChange={(e) => setSearchValue(e.target.value)}
        />

        {searchValue && (
          <button
            type="button"
            onClick={() => setSearchValue("")}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Category chips */}
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
                    ? "border-primary/40 bg-primary text-primary-foreground shadow-sm shadow-primary/10"
                    : "border-border/70 bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground"
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