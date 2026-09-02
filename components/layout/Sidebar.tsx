"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { consoleEntry, COMMUNITY_HOME, type ConsoleRole } from "@/lib/auth/console"
import {
  type LucideIcon,
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  User,
  Shield,
  ShieldCheck,
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
  Users,
  FileText,
  Mail,
  FolderOpen,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

// ─── Member navigation ──────────────────────────────────────

type NavLeaf = { label: string; href: string; icon: LucideIcon }

type NavGroup = {
  label: string
  icon: LucideIcon
  /** Any path under here keeps the group open and marks it active. */
  match: string[]
  children: NavLeaf[]
}

type NavEntry = NavLeaf | NavGroup

function isGroup(item: NavEntry): item is NavGroup {
  return "children" in item
}

function groupContainsRoute(group: NavGroup, pathname: string): boolean {
  return group.match.some(
    (m) => pathname === m || pathname.startsWith(m + "/")
  )
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

// ─── Admin console navigation ───────────────────────────────
// Grouped rather than a flat list of twenty items: the console is now a
// place you work in, not a drawer hanging off the member nav.

const adminNav: NavEntry[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: BarChart3 },
  { label: "Admin Panel", href: "/admin", icon: Shield },
  {
    label: "Members",
    icon: Users,
    match: ["/admin/members", "/admin/temp-password"],
    children: [
      { label: "All Members", href: "/admin/members", icon: Users },
      { label: "Temp Password", href: "/admin/temp-password", icon: KeyRound },
    ],
  },
  {
    label: "Practice",
    icon: CalendarCheck,
    match: [
      "/admin/practice-review",
      "/admin/checkin-questions",
      "/admin/prompts",
      "/admin/prompts-library",
    ],
    children: [
      { label: "Practice Review", href: "/admin/practice-review", icon: CalendarCheck },
      { label: "Check-in Questions", href: "/admin/checkin-questions", icon: ListChecks },
      { label: "Daily Prompts", href: "/admin/prompts", icon: Lightbulb },
      { label: "Prompt Library", href: "/admin/prompts-library", icon: Sparkles },
    ],
  },
  {
    label: "Assessments",
    icon: ClipboardCheck,
    match: [
      "/admin/assessment",
      "/admin/assessment-invites",
      "/admin/assessment-reports",
    ],
    children: [
      { label: "Wellbeing Check-ins", href: "/admin/assessment", icon: ClipboardCheck },
      { label: "Invites", href: "/admin/assessment-invites", icon: Mail },
      { label: "Reports", href: "/admin/assessment-reports", icon: FileText },
    ],
  },
  {
    label: "Content & Events",
    icon: FolderOpen,
    match: ["/admin/content", "/admin/events"],
    children: [
      { label: "Recordings", href: "/admin/content", icon: BookOpen },
      { label: "Live Sessions", href: "/admin/events", icon: Calendar },
    ],
  },
  {
    label: "Support",
    icon: LifeBuoy,
    match: ["/admin/support", "/admin/community-issues"],
    children: [
      { label: "Support Queries", href: "/admin/support", icon: CircleHelp },
      { label: "Community Issues", href: "/admin/community-issues", icon: LifeBuoy },
    ],
  },
]

const recordingAdminItems: NavLeaf[] = [
  { label: "Upload Recording", href: "/upload-recording", icon: UploadCloud },
]

// ─── Shared styling ─────────────────────────────────────────

const leafBase =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"

function isItemActive(pathname: string, href: string) {
  // /admin is a page in its own right, so a prefix match would light it up
  // on every console route.
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(href + "/")
}

type SidebarProps = {
  profile: {
    full_name: string
    avatar_url: string | null
    role: ConsoleRole
  } | null
  /** "admin" renders the dedicated console shell. Defaults to member. */
  variant?: "member" | "admin"
}

export function Sidebar({ profile, variant = "member" }: SidebarProps) {
  const pathname = usePathname()
  const entry = consoleEntry(profile?.role)

  // ── Admin console shell ───────────────────────────────────
  if (variant === "admin") {
    return (
      <aside className="hidden min-h-0 overflow-hidden border-r border-[#C89B3C]/20 bg-[#1A1207] text-[#F7F0E3] md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-[#C89B3C]/20 px-6 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#C89B3C] text-[#1A1207]">
            <ShieldCheck className="size-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-semibold">Admin Console</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D8B76A]">
              Valarmathi Community
            </span>
          </span>
        </div>

        <nav className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <NavList items={adminNav} pathname={pathname} />
        </nav>

        <div className="shrink-0 border-t border-[#C89B3C]/20 p-3">
          <Link
            href={COMMUNITY_HOME}
            className={cn(
              leafBase,
              "text-[#E8DDC8]/70 hover:bg-[#F7F0E3]/8 hover:text-[#F7F0E3]"
            )}
          >
            <ArrowLeft className="size-4" />
            Back to Community
          </Link>
        </div>
      </aside>
    )
  }

  // ── Member shell ──────────────────────────────────────────
  return (
    <aside className="hidden overflow-hidden border-r border-[#C89B3C]/20 bg-[#122015] text-[#F7F0E3] md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#C89B3C]/20 px-6 py-5">
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
        <NavList items={navItems} pathname={pathname} />

        {profile?.role === "recording_admin" && (
          <>
            <Separator className="my-4 bg-[#C89B3C]/20" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[#D8B76A]">
              Recording Access
            </p>
            <NavList items={recordingAdminItems} pathname={pathname} />
          </>
        )}
      </nav>

      {/* The switch into the console. Pinned to the footer so it does not
          scroll away, and absent entirely for ordinary members. */}
      {entry && (
        <div className="shrink-0 border-t border-[#C89B3C]/20 p-3">
          <Link
            href={entry.href}
            className={cn(
              leafBase,
              "justify-between bg-[#C89B3C]/12 text-[#D8B76A] hover:bg-[#C89B3C]/20"
            )}
          >
            <span className="flex items-center gap-3">
              <ShieldCheck className="size-4" />
              {entry.label}
            </span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
    </aside>
  )
}

// ─── Nav rendering ──────────────────────────────────────────

function NavList({
  items,
  pathname,
}: {
  items: NavEntry[]
  pathname: string
}) {
  return (
    <>
      {items.map((item) => {
        if (isGroup(item)) {
          const inside = groupContainsRoute(item, pathname)
          // Keying on `inside` remounts the group when the route crosses its
          // boundary, resetting a manual collapse so a member landing inside
          // from elsewhere can see where they are. Moving BETWEEN children
          // keeps `inside` true, so their choice survives.
          return (
            <NavGroupItem
              key={`${item.label}-${inside}`}
              group={item}
              pathname={pathname}
            />
          )
        }

        const isActive = isItemActive(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              leafBase,
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
  )
}

/**
 * A collapsible nav group. Opens automatically when the current route is
 * inside it, so someone deep-linked to a child never lands on a collapsed
 * menu with no idea where they are.
 */
function NavGroupItem({
  group,
  pathname,
}: {
  group: NavGroup
  pathname: string
}) {
  const containsRoute = groupContainsRoute(group, pathname)

  // null = follow the route; true/false = the member decided. An earlier
  // version did `open || containsRoute`, which pinned the group open while
  // you were inside it — the arrow looked broken exactly when you would
  // reach for it. An explicit click has to win.
  const [override, setOverride] = useState<boolean | null>(null)
  const expanded = override ?? containsRoute

  return (
    <div>
      <button
        type="button"
        onClick={() => setOverride(!expanded)}
        aria-expanded={expanded}
        className={cn(
          leafBase,
          "w-full",
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
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-[#C89B3C]/20 pl-3">
          {group.children.map((child) => {
            const isActive = isItemActive(pathname, child.href)

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
