"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ClipboardCheck,
  BookOpen,
  MessageSquare,
  User,
} from "lucide-react"

const tabs = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scan", href: "/assessment", icon: ClipboardCheck },
  { label: "Library", href: "/content", icon: BookOpen },
  { label: "Community", href: "/community", icon: MessageSquare },
  { label: "Profile", href: "/profile", icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#C89B3C]/20 bg-[#122015] pb-[env(safe-area-inset-bottom)] text-[#E8DDC8] shadow-2xl shadow-black/30 md:hidden">
      <div className="flex h-14 items-center justify-around">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/")

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-[#C89B3C]"
                  : "text-[#E8DDC8]/65 active:text-[#F7F0E3]"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                  isActive ? "bg-[#C89B3C]/15" : "bg-transparent"
                )}
              >
                <tab.icon
                  className={cn(
                    "h-[18px] w-[18px]",
                    isActive && "stroke-[2.5]"
                  )}
                />
              </div>

              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}