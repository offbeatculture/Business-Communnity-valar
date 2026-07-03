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
  Calendar,
  UploadCloud,
} from "lucide-react"
// import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { SupportWidget } from "@/components/support/SupportWidget"

type TopBarProps = {
  profile: {
    full_name: string
    avatar_url: string | null
    role?: "member" | "admin" | "recording_admin"
  } | null
}

const mobileNavItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Recordings", href: "/content", icon: BookOpen },
  { label: "Live Sessions", href: "/events", icon: Calendar },
  { label: "Breathwork Community", href: "/community", icon: MessageSquare },
  { label: "My Profile", href: "/profile", icon: User },
]

const adminItems = [
  { label: "Admin Panel", href: "/admin", icon: Shield },
  { label: "Daily Practice Prompts", href: "/admin/prompts", icon: Lightbulb },
]

const recordingAdminItems = [
  { label: "Upload Recording", href: "/upload-recording", icon: UploadCloud },
]

export function TopBar({ profile }: TopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const initials =
    profile?.full_name
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
      <header className="sticky top-0 z-40 flex h-14 select-none items-center justify-between border-b border-[#C89B3C]/20 bg-[#F7F0E3] px-4 text-[#4B3A25] shadow-sm shadow-black/5 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-[#4B3A25] hover:bg-[#C89B3C]/10 hover:text-[#8A6A22] md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>

        <div className="relative ml-2 hidden w-full max-w-sm md:ml-0 md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A6A22]" />
          <Input
            placeholder="Search breathwork resources..."
            className="border-[#C89B3C]/25 bg-[#E8DDC8] pl-9 text-[#4B3A25] placeholder:text-[#6F7358]/70 focus-visible:ring-[#C89B3C]"
            disabled
          />
        </div>

        <span className="flex-1 text-center text-sm font-semibold tracking-tight text-[#4B3A25] md:hidden">
          Daily Breathwork
        </span>

        <div className="ml-2 flex shrink-0 items-center gap-1 text-[#4B3A25]">
          <NotificationBell />
          <SupportWidget />

          {/* <div className="hidden md:block">
            <ThemeToggle />
          </div> */}

          <DropdownMenu>
            <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2 outline-none">
              <Avatar className="h-8 w-8 border border-[#C89B3C]/25">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-[#C89B3C]/15 text-xs text-[#8A6A22]">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <span className="hidden text-sm font-medium text-[#4B3A25] sm:inline-block">
                {profile?.full_name || "User"}
              </span>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-48 border-[#C89B3C]/25 bg-[#F7F0E3] text-[#4B3A25]"
            >
              <DropdownMenuItem
                onClick={() => router.push("/profile")}
                className="focus:bg-[#C89B3C]/10 focus:text-[#4B3A25]"
              >
                <User className="mr-2 h-4 w-4 text-[#8A6A22]" />
                My Profile
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/subscription")}
                className="focus:bg-[#C89B3C]/10 focus:text-[#4B3A25]"
              >
                <CreditCard className="mr-2 h-4 w-4 text-[#8A6A22]" />
                Subscription
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-[#C89B3C]/20" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-[#8A6A22] focus:bg-[#C89B3C]/10 focus:text-[#4B3A25]"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 top-14 z-50 transition-opacity duration-200 md:hidden",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        aria-hidden={!menuOpen}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setMenuOpen(false)}
        />

        <nav
          className={cn(
            "relative space-y-1 border-b border-[#C89B3C]/20 bg-[#122015] px-4 py-3 text-[#F7F0E3] transition-transform duration-200",
            menuOpen ? "translate-y-0" : "-translate-y-4"
          )}
        >
          {mobileNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/")

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-l-2 border-[#C89B3C] bg-[#F7F0E3] text-[#122015]"
                    : "text-[#E8DDC8]/70 hover:bg-[#F7F0E3]/8 hover:text-[#F7F0E3]"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-[#8A6A22]" : "text-[#E8DDC8]/60"
                  )}
                />
                {item.label}
              </Link>
            )
          })}

          {profile?.role === "recording_admin" && (
            <>
              <div className="my-2 border-t border-[#C89B3C]/20" />

              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-[#D8B76A]">
                Recording Access
              </p>

              {recordingAdminItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/")

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "border-l-2 border-[#C89B3C] bg-[#F7F0E3] text-[#122015]"
                        : "text-[#E8DDC8]/70 hover:bg-[#F7F0E3]/8 hover:text-[#F7F0E3]"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4",
                        isActive ? "text-[#8A6A22]" : "text-[#E8DDC8]/60"
                      )}
                    />
                    {item.label}
                  </Link>
                )
              })}
            </>
          )}

          {profile?.role === "admin" && (
            <>
              <div className="my-2 border-t border-[#C89B3C]/20" />

              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-[#D8B76A]">
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
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "border-l-2 border-[#C89B3C] bg-[#F7F0E3] text-[#122015]"
                        : "text-[#E8DDC8]/70 hover:bg-[#F7F0E3]/8 hover:text-[#F7F0E3]"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4",
                        isActive ? "text-[#8A6A22]" : "text-[#E8DDC8]/60"
                      )}
                    />
                    {item.label}
                  </Link>
                )
              })}
            </>
          )}

          <div className="my-2 border-t border-[#C89B3C]/20" />

          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-sm font-medium text-[#E8DDC8]/70">
              Support
            </span>
            <SupportWidget />
          </div>

          <div className="my-2 border-t border-[#C89B3C]/20" />

          <button
            onClick={() => {
              setMenuOpen(false)
              handleLogout()
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#D8B76A] transition-colors hover:bg-[#F7F0E3]/8"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
      </div>
    </>
  )
}