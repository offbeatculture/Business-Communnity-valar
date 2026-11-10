"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CreditCard, HeartPulse, Search, ShoppingCart, Webhook } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { label: "Reconciliation", href: "/admin/billing", icon: CreditCard },
  { label: "Member Lookup", href: "/admin/billing/lookup", icon: Search },
  { label: "Webhooks", href: "/admin/billing/webhooks", icon: Webhook },
  { label: "Unfinished Checkouts", href: "/admin/billing/checkouts", icon: ShoppingCart },
  { label: "Health Check", href: "/admin/billing/health", icon: HeartPulse },
]

export function BillingTabs() {
  const pathname = usePathname()
  return (
    <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b px-1">
      {TABS.map(({ label, href, icon: Icon }) => {
        const active = href === "/admin/billing" ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            <Icon className={cn("size-4", active && "text-primary")} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
