"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  canAccessPath,
  consoleEntry,
  COMMUNITY_HOME,
  type ConsoleRole,
} from "@/lib/auth/console"
import {
  adminNav,
  groupContainsRoute,
  isGroup,
  isItemActive,
  memberNav,
  recordingAdminNav,
  type NavEntry,
  type NavGroup,
} from "@/lib/nav"
import {
  ShieldCheck,
  Leaf,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

// ─── Shared styling ─────────────────────────────────────────

const leafBase =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"

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
          <NavList
            items={filterNav(adminNav, profile?.role)}
            pathname={pathname}
          />
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
        <NavList items={memberNav} pathname={pathname} />

        {profile?.role === "recording_admin" && (
          <>
            <Separator className="my-4 bg-[#C89B3C]/20" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[#D8B76A]">
              Recording Access
            </p>
            <NavList items={recordingAdminNav} pathname={pathname} />
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

/**
 * Drop anything this role may not open, and prune groups left empty.
 *
 * Presentation only — canAccessPath also runs in each page and route
 * handler, because a hidden link is not a closed door.
 */
function filterNav(items: NavEntry[], role: string | null | undefined): NavEntry[] {
  return items
    .map((item) => {
      if (!isGroup(item)) {
        return canAccessPath(role, item.href) ? item : null
      }

      const children = item.children.filter((c) => canAccessPath(role, c.href))
      return children.length > 0 ? { ...item, children } : null
    })
    .filter((item): item is NavEntry => item !== null)
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
