// The navigation, defined once.
//
// It used to live in three places — Sidebar, TopBar's mobile drawer and
// MobileNav — and they drifted: adding Panchakosha, Mano Mitra and My
// Practice to the sidebar left the mobile drawer showing a stale menu,
// and the drawer's admin list had only two of the twenty admin pages.
//
// Anything nav-shaped belongs here now. No JSX, so both server and client
// components can import it.

import {
  type LucideIcon,
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
  UploadCloud,
  BarChart3,
  KeyRound,
  LifeBuoy,
  CalendarCheck,
  ListChecks,
  HeartHandshake,
  PlayCircle,
  Flower2,
  Users,
  UserPlus,
  FileText,
  Mail,
  FolderOpen,
} from "lucide-react"

export type NavLeaf = { label: string; href: string; icon: LucideIcon }

export type NavGroup = {
  label: string
  icon: LucideIcon
  /** Any path under here keeps the group open and marks it active. */
  match: string[]
  children: NavLeaf[]
}

export type NavEntry = NavLeaf | NavGroup

export function isGroup(item: NavEntry): item is NavGroup {
  return "children" in item
}

export function groupContainsRoute(group: NavGroup, pathname: string): boolean {
  return group.match.some((m) => pathname === m || pathname.startsWith(m + "/"))
}

export function isItemActive(pathname: string, href: string) {
  // /admin is a page in its own right, so a prefix match would light it up
  // on every console route.
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(href + "/")
}

/** Flatten groups, for surfaces that cannot nest (the mobile drawer). */
export function flattenNav(items: NavEntry[]): NavLeaf[] {
  return items.flatMap((item) => (isGroup(item) ? item.children : [item]))
}

// ─── Member ─────────────────────────────────────────────────

export const memberNav: NavEntry[] = [
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

/** Bottom tab bar — five is the most that fits at 375px. */
export const mobileTabs: NavLeaf[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scan", href: "/assessment", icon: ClipboardCheck },
  { label: "Library", href: "/content", icon: BookOpen },
  { label: "Community", href: "/community", icon: MessageSquare },
  { label: "Profile", href: "/profile", icon: User },
]

// ─── Admin console ──────────────────────────────────────────

export const adminNav: NavEntry[] = [
  { label: "Overview", href: "/admin/staff", icon: LayoutDashboard },
  { label: "Follow-ups", href: "/admin/tasks", icon: ListChecks },
  { label: "Dashboard", href: "/admin/dashboard", icon: BarChart3 },
  { label: "Admin Panel", href: "/admin", icon: Shield },
  {
    label: "Members",
    icon: Users,
    match: ["/admin/members", "/admin/temp-password"],
    children: [
      { label: "All Members", href: "/admin/members", icon: Users },
      { label: "Add Member", href: "/admin/members/create", icon: UserPlus },
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

export const recordingAdminNav: NavLeaf[] = [
  { label: "Upload Recording", href: "/upload-recording", icon: UploadCloud },
]
