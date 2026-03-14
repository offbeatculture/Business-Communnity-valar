"use client"

import { useEffect } from "react"

export function ViewTracker({ id }: { id: string }) {
  useEffect(() => {
    fetch(`/api/content/${id}/view`, { method: "POST" }).catch(() => {})
  }, [id])

  return null
}
