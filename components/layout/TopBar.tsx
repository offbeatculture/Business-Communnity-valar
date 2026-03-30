"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  User,
  CreditCard,
  LogOut,
  Search,
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  Shield,
  Lightbulb,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

type TopBarProps = {
  profile: {
    full_name: string
    avatar_url: string | null
    role?: "member" | "admin"
  } | null
}

const mobileNavItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Content Library", href: "/content", icon: BookOpen },
  { label: "Community", href: "/community", icon: MessageSquare },
  { label: "My Profile", href: "/profile", icon: User },
  { label: "Subscription", href: "/subscription", icon: CreditCard },
]

const adminItems = [
  { label: "Admin Panel", href: "/admin", icon: Shield },
  { label: "Daily Prompts", href: "/admin/prompts", icon: Lightbulb },
]

export function TopBar({ profile }: TopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" })
    if (res.ok) {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 h-14 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6">
        {/* Hamburger - mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>

        {/* Search */}
        <div className="relative w-full max-w-sm ml-2 md:ml-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 bg-background"
            disabled
          />
        </div>

        {/* Theme Toggle + User Menu */}
        <div className="flex items-center gap-1 ml-2 shrink-0">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 outline-none cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:inline-block">
              {profile?.full_name || "User"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/subscription")}>
              <CreditCard className="mr-2 h-4 w-4" />
              Subscription
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-30">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          {/* Panel */}
          <nav className="relative bg-card border-b border-border px-4 py-3 space-y-1">
            {mobileNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
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
                <div className="border-t border-border my-2" />
                <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin
                </p>
                {adminItems.map((item) => {
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
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

            {/* Logout */}
            <div className="border-t border-border my-2" />
            <button
              onClick={() => {
                setMenuOpen(false)
                handleLogout()
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-accent/50 transition-colors w-full"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </nav>
        </div>
      )}
    </>
  )
}
