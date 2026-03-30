"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, BookOpen, MessageSquare, User } from "lucide-react"

const tabs = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Content", href: "/content", icon: BookOpen },
  { label: "Community", href: "/community", icon: MessageSquare },
  { label: "Profile", href: "/profile", icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-[env(safe-area-inset-bottom)] select-none">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/")
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-7 w-7 rounded-full transition-colors",
                isActive && "bg-primary/10"
              )}>
                <tab.icon className={cn("h-[18px] w-[18px]", isActive && "stroke-[2.5]")} />
              </div>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
