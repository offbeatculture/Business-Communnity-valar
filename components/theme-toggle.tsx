"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <Button variant="ghost" size="icon" className="size-8" disabled />

  function toggleTheme() {
    // Disable all transitions during theme switch to prevent color lag
    const style = document.createElement("style")
    style.textContent = "*, *::before, *::after { transition: none !important; }"
    document.head.appendChild(style)

    setTheme(theme === "dark" ? "light" : "dark")

    // Re-enable transitions after the repaint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove()
      })
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={toggleTheme}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
