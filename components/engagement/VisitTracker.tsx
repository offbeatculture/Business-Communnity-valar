"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { getLevelInfo } from "@/lib/engagement-constants"

export function VisitTracker() {
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    const key = `visit_tracked_${today}`

    if (localStorage.getItem(key)) return

    localStorage.setItem(key, "1")

    fetch("/api/engagement/visit", { method: "POST" })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        if (!data || data.already_visited) return

        // Check for level-up by comparing against last known level
        const lastLevel = parseInt(localStorage.getItem("last_known_level") ?? "0", 10)
        const currentLevel = data.current_level ?? 0

        if (currentLevel > 0) {
          localStorage.setItem("last_known_level", String(currentLevel))
        }

        if (lastLevel > 0 && currentLevel > lastLevel) {
          const levelInfo = getLevelInfo(currentLevel)
          toast.success(`Level Up! You're now a ${levelInfo.name}`, {
            description: `You've reached Level ${currentLevel}. Keep growing!`,
            duration: 6000,
          })
        }
      })
      .catch(() => {
        // Remove flag so it retries on next page load
        localStorage.removeItem(key)
      })
  }, [])

  return null
}
