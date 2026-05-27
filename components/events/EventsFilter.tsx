"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const filterTabs = [
  { value: "all", label: "100X Super Founder Room" },
  // { value: "workshop", label: "Workshops" },
  // { value: "ai_lab", label: "AI Lab" },
]

export function EventsFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = searchParams.get("type") ?? "all"

  const update = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === "all") {
        params.delete("type")
      } else {
        params.set("type", value)
      }
      params.delete("page")
      router.push(`/events?${params.toString()}`)
    },
    [router, searchParams],
  )

  return (
    <Tabs value={active} onValueChange={update}>
      <TabsList>
        {filterTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
