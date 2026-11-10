import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * The building blocks every Billing page is made of, so the five pages look
 * like one dashboard: the same cards, tables and four status colours.
 *
 *   good    — matches / working          (green)
 *   warn    — worth a look               (amber)
 *   bad     — needs fixing               (red)
 *   neutral — for information            (muted)
 *   brand   — selected / highlighted     (gold, the app's primary)
 */
export type Tone = "good" | "warn" | "bad" | "neutral" | "brand"

export const TONE_TEXT: Record<Tone, string> = {
  good: "text-emerald-700 dark:text-emerald-300",
  warn: "text-amber-700 dark:text-amber-300",
  bad: "text-destructive",
  neutral: "text-muted-foreground",
  brand: "text-primary",
}

const TONE_PILL: Record<Tone, string> = {
  good: "bg-emerald-600/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300",
  warn: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  bad: "bg-destructive/10 text-destructive ring-destructive/25",
  neutral: "bg-muted text-muted-foreground ring-border",
  brand: "bg-primary/10 text-primary ring-primary/25",
}

const TONE_TILE: Record<Tone, string> = {
  good: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  bad: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-primary/10 text-primary",
}

const TONE_DOT: Record<Tone, string> = {
  good: "bg-emerald-600",
  warn: "bg-amber-500",
  bad: "bg-destructive",
  neutral: "bg-muted-foreground/50",
  brand: "bg-primary",
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3",
        cols === 3 && "md:grid-cols-3",
        cols === 4 && "md:grid-cols-4"
      )}
    >
      {children}
    </div>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "brand",
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: Tone
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className={cn("rounded-lg p-2", TONE_TILE[tone])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-2xl font-bold tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {hint && <p className={cn("mt-1 text-xs", tone === "neutral" || tone === "brand" ? "text-muted-foreground" : TONE_TEXT[tone])}>{hint}</p>}
      </div>
    </div>
  )
}

/** A white card with a titled header, the container for every table and list. */
export function Panel({
  title,
  description,
  actions,
  children,
  flush = false,
  className,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  /** Content runs edge to edge (tables). */
  flush?: boolean
  className?: string
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  )
}

export function Pill({ tone = "neutral", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        TONE_PILL[tone]
      )}
    >
      <span className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />
      {children}
    </span>
  )
}

export function Callout({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: Tone
  icon: LucideIcon
  title: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className={cn("h-fit rounded-lg p-2", TONE_TILE[tone])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 text-sm">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-1 text-muted-foreground">{children}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-3">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}
    </div>
  )
}

/** Plain table in the shared style. Put it inside a flush Panel. */
export function DataTable({
  head,
  rows,
  empty,
  emptyIcon,
}: {
  head: string[]
  rows: React.ReactNode[][]
  empty: string
  emptyIcon: LucideIcon
}) {
  if (!rows.length) return <EmptyState icon={emptyIcon} title={empty} />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, i) => (
            <tr key={i} className="align-top transition-colors hover:bg-muted/30">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Small "label: value" list used inside detail cards. */
export function KeyValues({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs">{children}</span>
}
