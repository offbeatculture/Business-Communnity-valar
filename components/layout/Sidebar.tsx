"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  User,
  CreditCard,
  Shield,
  Users,
  Lightbulb,
  Sparkles,
  ClipboardCheck,
  FileQuestion,
  Calendar,
  CircleHelp,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Content Library", href: "/content", icon: BookOpen },
  { label: "Prompts", href: "/prompts", icon: Sparkles },
  { label: "Assessments", href: "/assessment", icon: FileQuestion },
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Community", href: "/community", icon: MessageSquare },
  { label: "My Profile", href: "/profile", icon: User },
  // { label: "Subscription", href: "/subscription", icon: CreditCard },
]

const adminItems = [
  { label: "Admin Panel", href: "/admin", icon: Shield },
  { label: "Events", href: "/admin/events", icon: Calendar },
  { label: "Daily Prompts", href: "/admin/prompts", icon: Lightbulb },
  { label: "Prompt Library", href: "/admin/prompts-library", icon: Sparkles },
  { label: "Assessment", href: "/admin/assessment", icon: ClipboardCheck },
  { label: "Support Queries", href: "/admin/support", icon: CircleHelp },
]

type SidebarProps = {
  profile: {
    full_name: string
    avatar_url: string | null
    role: "member" | "admin"
  } | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-card border-r border-border">
      {/* Brand */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <Users className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">Community</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
              {item.label}
            </Link>
          )
        })}

        {profile?.role === "admin" && (
          <>
            <Separator className="my-4" />
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
            {adminItems.map((item) => {
  const isActive =
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname === item.href || pathname.startsWith(item.href + "/")

  return (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-accent text-accent-foreground border-l-2 border-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
      {item.label}
    </Link>
  )
})}
          </>
        )}
      </nav>
    </aside>
  )
}
