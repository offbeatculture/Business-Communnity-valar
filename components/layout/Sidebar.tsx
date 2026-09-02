"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  User,
  Shield,
  Lightbulb,
  Sparkles,
  ClipboardCheck,
  Calendar,
  CircleHelp,
  Leaf,
  UploadCloud,
  BarChart3,
  KeyRound,
  LifeBuoy,
  CalendarCheck,
  ListChecks,
  HeartHandshake,
  PlayCircle,
  ChevronDown,
  Flower2,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

type NavLeaf = {
  label: string
  href: string
  icon: typeof LayoutDashboard
}

type NavGroup = {
  label: string
  icon: typeof LayoutDashboard
  /** Any path under here keeps the group open and marks it active. */
  match: string[]
  children: NavLeaf[]
}

type NavEntry = NavLeaf | NavGroup

function isGroup(item: NavEntry): item is NavGroup {
  return "children" in item
}

const navItems: NavEntry[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Panchakosha",
    icon: Flower2,
    match: ["/assessment", "/panchakosha"],
    children: [
      { label: "Kosha Scan", href: "/assessment", icon: ClipboardCheck },
      { label: "Panchakosha Videos", href: "/panchakosha/videos", icon: PlayCircle },
    ],
  },
  { label: "Mano Mitra", href: "/mano-mitra", icon: HeartHandshake },
  { label: "My Practice", href: "/practice", icon: CalendarCheck },
  { label: "Recordings", href: "/content", icon: BookOpen },
  { label: "Live Sessions", href: "/events", icon: Calendar },
  { label: "Breathwork Community", href: "/community", icon: MessageSquare },
  { label: "My Profile", href: "/profile", icon: User },
]

const adminItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: BarChart3 },
  { label: "Admin Panel", href: "/admin", icon: Shield },
  { label: "Temp Password", href: "/admin/temp-password", icon: KeyRound },
  { label: "Live Sessions", href: "/admin/events", icon: Calendar },
  { label: "Practice Review", href: "/admin/practice-review", icon: CalendarCheck },
  { label: "Check-in Questions", href: "/admin/checkin-questions", icon: ListChecks },
  { label: "Daily Practice Prompts", href: "/admin/prompts", icon: Lightbulb },
  { label: "Practice Prompt Library", href: "/admin/prompts-library", icon: Sparkles },
  { label: "Wellbeing Check-ins", href: "/admin/assessment", icon: ClipboardCheck },
  { label: "Community Issues", href: "/admin/community-issues", icon: LifeBuoy },
  { label: "Support Queries", href: "/admin/support", icon: CircleHelp },
]

const recordingAdminItems = [
  { label: "Upload Recording", href: "/upload-recording", icon: UploadCloud },
]

type SidebarProps = {
  profile: {
    full_name: string
    avatar_url: string | null
    role: "member" | "admin" | "recording_admin"
  } | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden overflow-hidden border-r border-[#C89B3C]/20 bg-[#122015] text-[#F7F0E3] md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
      <div className="flex items-center gap-3 border-b border-[#C89B3C]/20 px-6 py-5">
        <div className="flex size-9 items-center justify-center rounded-full bg-[#C89B3C]/12">
          <Leaf className="h-5 w-5 text-[#D8B76A]" />
        </div>

        <div>
          <span className="block text-base font-semibold leading-tight">
            Daily Breathwork
          </span>
          <span className="text-[11px] text-[#E8DDC8]/55">
            Valarmathi Community
          </span>
        </div>
      </div>

      <nav className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 pb-24">
        {navItems.map((item) => {
          if (isGroup(item)) {
            return <NavGroupItem key={item.label} group={item} pathname={pathname} />
          }

          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.href}
              href={item.href}
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
            <Separator className="my-4 bg-[#C89B3C]/20" />

            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[#D8B76A]">
              Recording Access
            </p>

            {recordingAdminItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/")

              return (
                <Link
                  key={item.href}
                  href={item.href}
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
            <Separator className="my-4 bg-[#C89B3C]/20" />

            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[#D8B76A]">
              Admin
            </p>

            {adminItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/")

              return (
                <Link
                  key={item.href}
                  href={item.href}
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
      </nav>
    </aside>
  )
}

/**
 * A collapsible nav group. Opens automatically when the current route is
 * inside it, so a member deep-linked to a child never lands on a
 * collapsed menu with no idea where they are.
 */
function NavGroupItem({
  group,
  pathname,
}: {
  group: NavGroup
  pathname: string
}) {
  const containsRoute = group.match.some(
    (m) => pathname === m || pathname.startsWith(m + "/")
  )
  const [open, setOpen] = useState(containsRoute)

  // The route can change without this component remounting (client-side
  // navigation), so re-open on entry rather than relying on initial state.
  const expanded = open || containsRoute

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={expanded}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          containsRoute
            ? "text-[#F7F0E3]"
            : "text-[#E8DDC8]/70 hover:bg-[#F7F0E3]/8 hover:text-[#F7F0E3]"
        )}
      >
        <group.icon
          className={cn(
            "h-4 w-4",
            containsRoute ? "text-[#D8B76A]" : "text-[#E8DDC8]/60"
          )}
        />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            expanded ? "rotate-180" : "",
            containsRoute ? "text-[#D8B76A]" : "text-[#E8DDC8]/50"
          )}
        />
      </button>

      {expanded && (
        <div className="mt-0.5 space-y-0.5 border-l border-[#C89B3C]/20 pl-3 ml-5">
          {group.children.map((child) => {
            const isActive =
              pathname === child.href || pathname.startsWith(child.href + "/")

            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#F7F0E3] text-[#122015]"
                    : "text-[#E8DDC8]/65 hover:bg-[#F7F0E3]/8 hover:text-[#F7F0E3]"
                )}
              >
                <child.icon
                  className={cn(
                    "h-3.5 w-3.5",
                    isActive ? "text-[#8A6A22]" : "text-[#E8DDC8]/55"
                  )}
                />
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
