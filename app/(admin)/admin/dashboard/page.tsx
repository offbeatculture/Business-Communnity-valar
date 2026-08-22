import type { ElementType } from "react"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminAnalyticsCharts } from "@/components/admin/AdminAnalyticsCharts"
import { AdminMemberSearch } from "@/components/admin/AdminMemberSearch"
import {
  AdminShowMoreTable,
  type AdminTableRow,
} from "@/components/admin/AdminShowMoreTable"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FolderOpen,
  IndianRupee,
  LifeBuoy,
  MessageSquare,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  WalletCards,
  Zap,
} from "lucide-react"

export const dynamic = "force-dynamic"

const TIME_ZONE = "Asia/Kolkata"

type DashboardPeriod = "today" | "week" | "month"

type AdminDashboardPageProps = {
  searchParams?: Promise<{ range?: string }> | { range?: string }
}

type SubscriptionRow = {
  id: string
  user_id: string
  status: string | null
  recurring_status: string | null
  tier: string | null
  amount_paid: number | null
  amount_paise: number | null
  razorpay_subscription_id: string | null
  razorpay_payment_id: string | null
  starts_at: string | null
  expires_at: string | null
  created_at: string | null
  updated_at: string | null
}

type ProfileRow = {
  user_id: string
  full_name: string | null
  phone: string | null
  city: string | null
  role: string | null
}

type AuthUserRow = {
  id: string
  email: string | null
  phone: string | null
  user_metadata?: Record<string, unknown> | null
}

type ActivityRow = {
  id: string
  created_at: string | null
}

type SupportQueryRow = {
  id: string
  status: string | null
  created_at: string | null
}

type SegmentTone = "strong" | "muted" | "faint"

type Segment = {
  label: string
  value: number
  tone: SegmentTone
}

type Flag = {
  label: string
  value: number
}

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const params = await searchParams
  const selectedPeriod = getDashboardPeriod(params?.range)

  const supabase = createAdminClient()
  const now = new Date()

  const { periodStart, periodEnd } = getDashboardPeriodWindow(
    selectedPeriod,
    now
  )

  const periodLabel = getDashboardPeriodLabel(selectedPeriod, periodStart, now)
  const periodShortLabel = getDashboardPeriodShortLabel(selectedPeriod)
  const periodStatLabel = getDashboardPeriodStatLabel(selectedPeriod)

  const [
    subscriptionsRes,
    profilesRes,
    authUsersRes,
    recordingsRes,
    postsRes,
    commentsRes,
    likesRes,
    foldersRes,
    supportQueriesRes,
    liveSessionsRes,
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "id, user_id, status, recurring_status, tier, amount_paid, amount_paise, razorpay_subscription_id, razorpay_payment_id, starts_at, expires_at, created_at, updated_at"
      )
      .eq("tier", "membership"),

    supabase.from("profiles").select("user_id, full_name, phone, city, role"),

    supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),

    supabase
      .from("video_summaries")
      .select("id, created_at", { count: "exact", head: false }),

    supabase
      .from("posts")
      .select("id, created_at", { count: "exact", head: false }),

    supabase.from("comments").select("id", { count: "exact", head: true }),

    supabase.from("likes").select("id", { count: "exact", head: true }),

    supabase
      .from("content_folders")
      .select("id, created_at", { count: "exact", head: false }),

    supabase
      .from("support_queries")
      .select("id, status, created_at", { count: "exact", head: false }),

    supabase
      .from("live_sessions")
      .select("id, created_at", { count: "exact", head: false }),
  ])

  const subscriptions = (subscriptionsRes.data ?? []) as SubscriptionRow[]
  const profiles = (profilesRes.data ?? []) as ProfileRow[]
  const authUsers = (authUsersRes.data?.users ?? []) as unknown as AuthUserRow[]
  const posts = (postsRes.data ?? []) as ActivityRow[]
  const recordings = (recordingsRes.data ?? []) as ActivityRow[]
  const supportQueries = (supportQueriesRes.data ?? []) as SupportQueryRow[]
  const liveSessions = (liveSessionsRes.data ?? []) as ActivityRow[]

  const profileMap = new Map<string, ProfileRow>()
  profiles.forEach((profile) => {
    profileMap.set(profile.user_id, profile)
  })

  const authUserMap = new Map<string, AuthUserRow>()
  authUsers.forEach((user) => {
    authUserMap.set(user.id, user)
  })

  const latestSubscriptionMap = new Map<string, SubscriptionRow>()

  subscriptions
    .slice()
    .sort((a, b) => getRowTime(b) - getRowTime(a))
    .forEach((sub) => {
      if (!latestSubscriptionMap.has(sub.user_id)) {
        latestSubscriptionMap.set(sub.user_id, sub)
      }
    })

  const currentSubscriptions = Array.from(latestSubscriptionMap.values())

  const dbActiveSubscriptions = currentSubscriptions.filter(
    (sub) => sub.status === "active" && sub.tier === "membership"
  )

  const activeAccess = dbActiveSubscriptions.filter((sub) =>
    hasFutureExpiry(sub, now)
  )

  const activeButExpired = dbActiveSubscriptions.filter(
    (sub) => !hasFutureExpiry(sub, now)
  )

  const expiredAccess = currentSubscriptions.filter(
    (sub) => sub.expires_at && new Date(sub.expires_at) <= now
  )

  const noExpiryRecorded = currentSubscriptions.filter((sub) => !sub.expires_at)

  const recurringActive = activeAccess.filter(
    (sub) => sub.recurring_status === "active" && !!sub.razorpay_subscription_id
  )

  const manualUsers = activeAccess.filter(
    (sub) =>
      sub.recurring_status === "cancelled" || !sub.razorpay_subscription_id
  )

  const otherPaymentUsers = activeAccess.filter(
    (sub) => !recurringActive.includes(sub) && !manualUsers.includes(sub)
  )

  const recurringMissingRazorpay = activeAccess.filter(
    (sub) => sub.recurring_status === "active" && !sub.razorpay_subscription_id
  )

  const expiringIn7Days = activeAccess.filter((sub) => {
    if (!sub.expires_at) return false

    const expiry = new Date(sub.expires_at)
    return expiry > now && expiry < periodEnd
  })

  const expiringThisMonth = activeAccess.filter((sub) => {
    if (!sub.expires_at) return false

    const expiry = new Date(sub.expires_at)
    return expiry > now && expiry < periodEnd
  })

  const newThisMonth = currentSubscriptions.filter((sub) => {
    if (!sub.created_at) return false

    const created = new Date(sub.created_at)
    return created >= periodStart && created < periodEnd
  })

  const revenueRowsThisMonth = subscriptions.filter((sub) => {
    if (!sub.created_at) return false

    const created = new Date(sub.created_at)
    return created >= periodStart && created < periodEnd
  })

  const monthlyRevenue = revenueRowsThisMonth.reduce(
    (total, sub) => total + getAmountInPaise(sub),
    0
  )

  const totalRevenue = subscriptions.reduce(
    (total, sub) => total + getAmountInPaise(sub),
    0
  )

  const paidRows = subscriptions.filter((sub) => getAmountInPaise(sub) > 0)

  const averagePayment = paidRows.length
    ? Math.round(totalRevenue / paidRows.length)
    : 0

  const recordingsCount = recordingsRes.count ?? recordings.length
  const postsCount = postsRes.count ?? posts.length
  const commentsCount = commentsRes.count ?? 0
  const likesCount = likesRes.count ?? 0
  const foldersCount = foldersRes.count ?? foldersRes.data?.length ?? 0
  const supportCount = supportQueriesRes.count ?? supportQueries.length
  const liveSessionsCount = liveSessionsRes.count ?? liveSessions.length

  const postsThisMonth = posts.filter((post) => {
    if (!post.created_at) return false

    const created = new Date(post.created_at)
    return created >= periodStart && created < periodEnd
  })

  const recordingsThisMonth = recordings.filter((recording) => {
    if (!recording.created_at) return false

    const created = new Date(recording.created_at)
    return created >= periodStart && created < periodEnd
  })

  const openSupportQueries = supportQueries.filter((query) => {
    const status = query.status?.toLowerCase()
    return !status || status === "open" || status === "pending"
  })

  const inProgressSupportQueries = supportQueries.filter((query) => {
    const status = query.status?.toLowerCase()
    return status === "in_progress" || status === "in progress"
  })

  const closedSupportQueries = supportQueries.filter((query) => {
    const status = query.status?.toLowerCase()
    return status === "closed" || status === "resolved"
  })

  const paymentCaptured = subscriptions.filter((sub) => {
    return !!sub.razorpay_payment_id || getAmountInPaise(sub) > 0
  })

  const paymentRowsThisMonth = revenueRowsThisMonth.filter(
    (sub) => getAmountInPaise(sub) > 0
  )

  const renewalsCharged = paymentRowsThisMonth.filter(
    (sub) => sub.recurring_status === "active"
  )

  const manualPaymentsThisMonth = paymentRowsThisMonth.filter(
    (sub) =>
      sub.recurring_status === "cancelled" || !sub.razorpay_subscription_id
  )

  const incompleteProfiles = currentSubscriptions.filter((sub) => {
    const profile = profileMap.get(sub.user_id)
    const authUser = authUserMap.get(sub.user_id)

    const name =
      profile?.full_name ||
      getMetadataValue(authUser, ["full_name", "name", "display_name"])

    const phone =
      profile?.phone ||
      authUser?.phone ||
      getMetadataValue(authUser, [
        "phone",
        "mobile",
        "mobile_number",
        "contact",
        "contact_number",
      ])

    return !name || !phone
  })

  const revenueByDate = new Map<
    string,
    {
      sortDate: string
      date: string
      revenue: number
    }
  >()

  const cursor = new Date(periodStart)
  while (cursor <= now) {
    const key = getDateKey(cursor)

    revenueByDate.set(key, {
      sortDate: key,
      date: formatChartDate(cursor),
      revenue: 0,
    })

    cursor.setDate(cursor.getDate() + 1)
  }

  revenueRowsThisMonth.forEach((sub) => {
    if (!sub.created_at) return

    const created = new Date(sub.created_at)
    const key = getDateKey(created)
    const amountInRupees = Math.round(getAmountInPaise(sub) / 100)

    const existing = revenueByDate.get(key)

    if (existing) {
      revenueByDate.set(key, {
        ...existing,
        revenue: existing.revenue + amountInRupees,
      })
    } else {
      revenueByDate.set(key, {
        sortDate: key,
        date: formatChartDate(created),
        revenue: amountInRupees,
      })
    }
  })

  const revenueChart = Array.from(revenueByDate.values())
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
    .map(({ date, revenue }) => ({
      date,
      revenue,
    }))

  const byExpiryAsc = (a: SubscriptionRow, b: SubscriptionRow) => {
    const aDate = a.expires_at ? new Date(a.expires_at).getTime() : 0
    const bDate = b.expires_at ? new Date(b.expires_at).getTime() : 0
    return aDate - bDate
  }

  const byCreatedDesc = (a: SubscriptionRow, b: SubscriptionRow) => {
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
    return bDate - aDate
  }

  const activeMemberTableRows = toAdminTableRows(
    activeAccess.slice().sort(byExpiryAsc),
    profileMap,
    authUserMap
  )

  const expiring7DaysTableRows = toAdminTableRows(
    expiringIn7Days.slice().sort(byExpiryAsc),
    profileMap,
    authUserMap
  )

  const newThisMonthTableRows = toAdminTableRows(
    newThisMonth.slice().sort(byCreatedDesc),
    profileMap,
    authUserMap
  )

  const renewalAlertTableRows = toAdminTableRows(
    expiringThisMonth.slice().sort(byExpiryAsc),
    profileMap,
    authUserMap
  )

  const recentManualTableRows = toAdminTableRows(
    manualUsers.slice().sort(byExpiryAsc),
    profileMap,
    authUserMap
  )

  const activeExpiredTableRows = toAdminTableRows(
    activeButExpired.slice().sort(byExpiryAsc),
    profileMap,
    authUserMap
  )

  const allMemberTableRows = toAdminTableRows(
    currentSubscriptions.slice().sort(byCreatedDesc),
    profileMap,
    authUserMap
  )

  const recentPosts = posts
    .slice()
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 5)

  const recentGatewayEvents = subscriptions
    .slice()
    .filter((sub) => sub.created_at || sub.updated_at)
    .sort((a, b) => getRowTime(b) - getRowTime(a))
    .slice(0, 6)

  const accessChart = [
    { label: "Active Access Now", value: activeAccess.length },
    { label: "DB Active Status", value: dbActiveSubscriptions.length },
    { label: "Active But Expired", value: activeButExpired.length },
    { label: "Expired Members", value: expiredAccess.length },
  ]

  const paymentChart = [
    { label: "Recurring Active", value: recurringActive.length },
    { label: "Manual / GPay", value: manualUsers.length },
    { label: "Missing Razorpay ID", value: recurringMissingRazorpay.length },
  ]

  const renewalChart = [
    { label: `Expiring ${periodStatLabel}`, value: expiringIn7Days.length },
    { label: `Renewing ${periodStatLabel}`, value: expiringThisMonth.length },
    { label: `New ${periodStatLabel}`, value: newThisMonth.length },
  ]

  const contentChart = [
    { label: "Recordings", value: recordingsCount },
    { label: "Community Posts", value: postsCount },
    { label: "Comments", value: commentsCount },
    { label: "Likes", value: likesCount },
  ]

  const membershipSegments: Segment[] = (
    [
      { label: "Active", value: activeAccess.length, tone: "strong" },
      { label: "Expired", value: expiredAccess.length, tone: "muted" },
      { label: "No expiry set", value: noExpiryRecorded.length, tone: "faint" },
    ] as Segment[]
  ).filter((segment) => segment.value > 0)

  const membershipFlags: Flag[] = (
    [
      {
        label: "Still marked active after expiry",
        value: activeButExpired.length,
      },
    ] as Flag[]
  ).filter((flag) => flag.value > 0)

  const paymentSegments: Segment[] = (
    [
      { label: "Auto-renewal", value: recurringActive.length, tone: "strong" },
      { label: "Manual / GPay", value: manualUsers.length, tone: "muted" },
      { label: "Other", value: otherPaymentUsers.length, tone: "faint" },
    ] as Segment[]
  ).filter((segment) => segment.value > 0)

  const paymentFlags: Flag[] = (
    [
      { label: "Missing Razorpay ID", value: recurringMissingRazorpay.length },
    ] as Flag[]
  ).filter((flag) => flag.value > 0)

  const attentionItems = [
    activeButExpired.length > 0
      ? `${formatNumber(
          activeButExpired.length
        )} members are still marked active after their expiry date`
      : null,
    recurringMissingRazorpay.length > 0
      ? `${formatNumber(
          recurringMissingRazorpay.length
        )} recurring members have no Razorpay subscription ID`
      : null,
    expiringIn7Days.length > 0
      ? `${formatNumber(expiringIn7Days.length)} members expire ${periodShortLabel}`
      : null,
    incompleteProfiles.length > 0
      ? `${formatNumber(
          incompleteProfiles.length
        )} member profiles are incomplete`
      : null,
  ].filter(Boolean) as string[]

  const lastUpdated = now.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  })

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <div className="rounded-2xl border border-border/70 bg-background/40 py-3 pl-11 pr-4 text-sm text-muted-foreground">
              Search members, payments, posts...
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <ArrowRight className="size-4 rotate-180" />
              Exit to Community
            </Link>

            <PeriodTabs selectedPeriod={selectedPeriod} />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <ShieldCheck className="size-3.5" />
                Admin Command Center
              </span>

              {attentionItems.length > 0 && (
                <Link
                  href="#needs-attention-panel"
                  className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15"
                >
                  Needs attention
                </Link>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Admin Command Center
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Manage Valar community members, subscriptions, payments, content,
              support, renewals and daily activity for {periodLabel}.
            </p>
          </div>

          <span className="rounded-full border border-border/60 bg-background/40 px-4 py-2 text-xs text-muted-foreground">
            Updated {lastUpdated} IST
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <ActionPill
            href="/admin/events"
            icon={CalendarDays}
            label="Create Event"
          />
          <ActionPill
            href="/admin/content"
            icon={FolderOpen}
            label="Add Content"
          />
          <ActionPill
            href="/admin/support"
            icon={LifeBuoy}
            label="Review Support"
          />
          <ActionPill
            href="#payment-health"
            icon={WalletCards}
            label="Payment Health"
          />
          <ActionPill href="#member-lists" icon={Users} label="Review Members" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          href="#member-lists"
          title="Total members"
          value={formatNumber(currentSubscriptions.length)}
          description="Membership records"
          icon={Users}
          className="bg-gradient-to-br from-[#5146E9] to-[#6B5EF8]"
        />

        <MetricCard
          href="#active-members-list"
          title="Active subscriptions"
          value={formatNumber(activeAccess.length)}
          description="Can access community"
          icon={CreditCard}
          className="bg-gradient-to-br from-[#7C3AED] to-[#A855F7]"
        />

        <MetricCard
          href="#new-members-this-month-list"
          title="New members"
          value={formatNumber(newThisMonth.length)}
          description={`Joined ${periodShortLabel}`}
          icon={Sparkles}
          className="bg-gradient-to-br from-[#2563EB] to-[#3B82F6]"
        />

        <MetricCard
          href="#expiring-7-days-list"
          title="Expiring soon"
          value={formatNumber(expiringIn7Days.length)}
          description={periodStatLabel}
          icon={CalendarClock}
          className="bg-gradient-to-br from-[#F59E0B] to-[#FB923C]"
        />

        <MetricCard
          href="#analysis"
          title="Revenue"
          value={formatCurrency(monthlyRevenue)}
          description={periodStatLabel}
          icon={IndianRupee}
          className="bg-gradient-to-br from-[#0F9F8F] to-[#14B8A6]"
        />

        <MetricCard
          href="#support-panel"
          title="Open support"
          value={formatNumber(openSupportQueries.length)}
          description="Needs response"
          icon={LifeBuoy}
          className="bg-gradient-to-br from-[#E11D48] to-[#FB7185]"
        />

        <MetricCard
          href="#manual-members-list"
          title="Manual / GPay"
          value={formatNumber(manualUsers.length)}
          description="Active manual users"
          icon={WalletCards}
          className="bg-gradient-to-br from-[#F97316] to-[#FB923C]"
        />

        <MetricCard
          href="#community-moderation"
          title="Community posts"
          value={formatNumber(postsThisMonth.length)}
          description={`Posts ${periodShortLabel}`}
          icon={MessageSquare}
          className="bg-gradient-to-br from-[#2563EB] to-[#3B82F6]"
        />

        <MetricCard
          href="#events-panel"
          title="Upcoming events"
          value={formatNumber(liveSessionsCount)}
          description="Live session records"
          icon={CalendarDays}
          className="bg-gradient-to-br from-[#7C3AED] to-[#A855F7]"
        />

        <MetricCard
          href="#content-library-panel"
          title="Recordings"
          value={formatNumber(recordingsCount)}
          description="Content library"
          icon={Video}
          className="bg-gradient-to-br from-[#0F9F8F] to-[#14B8A6]"
        />
      </section>

      <AdminAnalyticsCharts
        accessChart={accessChart}
        paymentChart={paymentChart}
        renewalChart={renewalChart}
        contentChart={contentChart}
        revenueChart={revenueChart}
        totalRevenue={formatCurrency(totalRevenue)}
        monthlyRevenue={formatCurrency(monthlyRevenue)}
      />

      <section className="grid items-start gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <DashboardPanel
            title="Subscriptions"
            icon={ClipboardList}
            actionLabel="View all"
            href="#member-lists"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <PanelStat value={activeAccess.length} label="Active" />
              <PanelStat
                value={newThisMonth.length}
                label={`New ${periodShortLabel}`}
              />
              <PanelStat value={manualUsers.length} label="Manual / GPay" />
              <PanelStat value={expiredAccess.length} label="Expired" />
            </div>
          </DashboardPanel>

          <DashboardPanel
            id="payment-health"
            title="Payment health"
            icon={Zap}
            actionLabel="Review payments"
            href="#member-lists"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <PanelStat
                value={paymentCaptured.length}
                label="Payments captured"
              />
              <PanelStat
                value={paymentRowsThisMonth.length}
                label={`Payments ${periodShortLabel}`}
              />
              <PanelStat value={renewalsCharged.length} label="Renewals charged" />
              <PanelStat
                value={manualPaymentsThisMonth.length}
                label="Manual payments"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
              Razorpay payment health is calculated from subscription payment
              rows, captured payment IDs and recurring status.
            </div>
          </DashboardPanel>

          <DashboardPanel
            id="community-moderation"
            title="Community moderation"
            icon={MessageSquare}
            actionLabel="Open community"
            href="/community"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <PanelStat value={postsCount} label="Total posts" />
              <PanelStat
                value={postsThisMonth.length}
                label={`Posts ${periodShortLabel}`}
              />
              <PanelStat value={commentsCount} label="Comments" />
            </div>

            <div className="mt-5 divide-y divide-border/60">
              {recentPosts.length > 0 ? (
                recentPosts.map((post, index) => (
                  <div key={post.id} className="py-3">
                    <p className="truncate text-sm font-semibold">
                      Community post #{index + 1}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {post.created_at
                        ? formatShortDate(post.created_at)
                        : "No date"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-3 text-sm text-muted-foreground">
                  No recent community posts found.
                </p>
              )}
            </div>
          </DashboardPanel>
        </div>

        <div className="space-y-6">
          <DashboardPanel
            id="support-panel"
            title="Support"
            icon={LifeBuoy}
            actionLabel="View all"
            href="/admin/support"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <PanelStat value={supportCount} label="Total support" />
              <PanelStat value={openSupportQueries.length} label="Open" />
              <PanelStat
                value={inProgressSupportQueries.length}
                label="In progress"
              />
              <PanelStat value={closedSupportQueries.length} label="Closed" />
            </div>
          </DashboardPanel>

          <DashboardPanel
            id="content-library-panel"
            title="Content library"
            icon={FolderOpen}
            actionLabel="View all"
            href="/admin/content"
          >
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <PanelStat value={foldersCount} label="Folders" />
              <PanelStat value={recordingsCount} label="Recordings" />
              <PanelStat
                value={recordingsThisMonth.length}
                label={`Added ${periodShortLabel}`}
              />
            </div>
          </DashboardPanel>

          <DashboardPanel
            id="events-panel"
            title="Events"
            icon={CalendarDays}
            actionLabel="View all"
            href="/admin/events"
          >
            {liveSessionsCount > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <PanelStat
                  value={liveSessionsCount}
                  label="Live session records"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming event records found.
              </p>
            )}
          </DashboardPanel>

          <DashboardPanel title="Recent gateway events" icon={Zap}>
            <div className="space-y-3">
              {recentGatewayEvents.length > 0 ? (
                recentGatewayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="font-mono font-semibold">
                      {event.status === "active"
                        ? "payment.captured"
                        : "subscription.updated"}
                    </span>

                    <span className="shrink-0 text-xs text-muted-foreground">
                      {event.created_at
                        ? formatShortDate(event.created_at)
                        : "No date"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent gateway events found.
                </p>
              )}
            </div>
          </DashboardPanel>
        </div>
      </section>

      {attentionItems.length > 0 && (
        <Card
          id="needs-attention-panel"
          className="scroll-mt-24 overflow-hidden border-destructive/40 bg-destructive/5 shadow-sm"
        >
          <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10">
                <AlertTriangle className="size-5 text-destructive" />
              </span>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-destructive">
                  Needs attention
                </p>

                <ul className="space-y-1 text-sm text-muted-foreground">
                  {attentionItems.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-destructive" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Link href="#member-lists" className="shrink-0">
              <Button variant="outline" size="sm">
                Review members
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <BreakdownPanel
          title="Membership status"
          icon={Users}
          value={activeAccess.length}
          total={currentSubscriptions.length}
          leadLabel="members can use the app today"
          segments={membershipSegments}
          flags={membershipFlags}
          footerLabel={`Joined ${periodShortLabel}`}
          footerValue={formatNumber(newThisMonth.length)}
        />

        <BreakdownPanel
          title="How active members pay"
          icon={CreditCard}
          value={recurringActive.length}
          total={activeAccess.length}
          leadLabel="active members renew automatically"
          segments={paymentSegments}
          flags={paymentFlags}
          footerLabel={`Revenue ${periodShortLabel}`}
          footerValue={formatCurrency(monthlyRevenue)}
        />
      </section>

      <section id="member-lists" className="space-y-6 scroll-mt-24">
        <div className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Member Operations
            </p>

            <h2 className="text-2xl font-bold tracking-tight">Member lists</h2>

            <p className="text-sm text-muted-foreground">
              Member access, new joins and renewal follow-up queues.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
            <AdminMemberSearch rows={allMemberTableRows} />

            <span className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
              {formatNumber(currentSubscriptions.length)} total membership records
            </span>
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-2">
          <TableCard
            id="active-members-list"
            title="Active members"
            count={activeMemberTableRows.length}
            description="All members who can currently access the community"
            rows={activeMemberTableRows}
            emptyText="No active members found."
          />

          <TableCard
            id="new-members-this-month-list"
            title={`New members ${periodShortLabel}`}
            count={newThisMonthTableRows.length}
            description={`Members who joined ${periodShortLabel}`}
            rows={newThisMonthTableRows}
            emptyText="No new members joined this month."
          />

          <TableCard
            id="expiring-7-days-list"
            title={`Expiring ${periodShortLabel}`}
            count={expiring7DaysTableRows.length}
            description={`Members whose access will expire ${periodShortLabel}`}
            rows={expiring7DaysTableRows}
            emptyText={`No members expire ${periodShortLabel}.`}
            tone={expiring7DaysTableRows.length > 0 ? "warning" : "default"}
          />

          <TableCard
            title={`Renewing ${periodShortLabel}`}
            count={renewalAlertTableRows.length}
            description={`Members whose access expires ${periodShortLabel}`}
            rows={renewalAlertTableRows}
            emptyText={`No members expire ${periodShortLabel}.`}
          />

          <TableCard
            id="manual-members-list"
            title="Manual / GPay members"
            count={recentManualTableRows.length}
            description="Active access without auto-renewal"
            rows={recentManualTableRows}
            emptyText="Every active member is on auto-renewal."
          />

          <TableCard
            id="active-expired-list"
            title="Active but expired"
            count={activeExpiredTableRows.length}
            description="Status still active after the expiry date — needs a data fix"
            rows={activeExpiredTableRows}
            emptyText="No mismatched records found."
            initialLimit={10}
            tone="destructive"
          />
        </div>
      </section>

      <div className="flex justify-end border-t border-border/60 pt-6">
        <Link href="/admin">
          <Button variant="outline">Back to admin panel</Button>
        </Link>
      </div>
    </div>
  )
}

function ActionPill({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: ElementType
  label: string
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/60 hover:text-primary"
    >
      <Icon className="size-4 text-primary" />
      {label}
    </Link>
  )
}

function PeriodTabs({ selectedPeriod }: { selectedPeriod: DashboardPeriod }) {
  const tabs: { label: string; value: DashboardPeriod }[] = [
    { label: "Today", value: "today" },
    { label: "This week", value: "week" },
    { label: "This month", value: "month" },
  ]

  return (
    <div className="flex rounded-full border border-border/70 bg-background/40 p-1">
      {tabs.map((tab) => {
        const isActive = selectedPeriod === tab.value

        return (
          <Link
            key={tab.value}
            href={`/admin/dashboard?range=${tab.value}`}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              isActive
                ? "bg-primary font-semibold text-primary-foreground"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  className,
  href,
}: {
  title: string
  value: string
  description: string
  icon: ElementType
  className: string
  href?: string
}) {
  const card = (
    <Card
      className={`group overflow-hidden border-0 text-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${className}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/20">
            <Icon className="size-5" />
          </div>

          {href && (
            <span className="text-xs font-semibold text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
              View →
            </span>
          )}
        </div>

        <p className="mt-6 text-3xl font-bold tracking-tight tabular-nums">
          {value}
        </p>

        <p className="mt-1 text-sm text-white/90">{title}</p>
        <p className="mt-0.5 text-xs text-white/75">{description}</p>
      </CardContent>
    </Card>
  )

  if (!href) return card

  return (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  )
}

function DashboardPanel({
  id,
  title,
  icon: Icon,
  children,
  actionLabel,
  href,
}: {
  id?: string
  title: string
  icon: ElementType
  children: React.ReactNode
  actionLabel?: string
  href?: string
}) {
  return (
    <Card
      id={id}
      className="scroll-mt-24 overflow-hidden border-border/70 bg-card shadow-sm"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="size-5 text-primary" />
          {title}
        </CardTitle>

        {href && actionLabel && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            {actionLabel}
            <ArrowRight className="size-4" />
          </Link>
        )}
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  )
}

function PanelStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-background/40 p-4">
      <p className="text-2xl font-bold tabular-nums">
        {formatNumber(Number(value))}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function BreakdownPanel({
  title,
  icon: Icon,
  value,
  total,
  leadLabel,
  segments,
  flags,
  footerLabel,
  footerValue,
}: {
  title: string
  icon: ElementType
  value: number
  total: number
  leadLabel: string
  segments: Segment[]
  flags: Flag[]
  footerLabel: string
  footerValue: string
}) {
  return (
    <Card className="flex h-full flex-col border-border/70 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Operational breakdown
          </p>
        </div>

        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="size-5 text-primary" />
        </span>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        <div>
          <p className="text-4xl font-bold tracking-tight tabular-nums">
            {formatNumber(value)}
            <span className="ml-1 text-xl font-semibold text-muted-foreground">
              / {formatNumber(total)}
            </span>
          </p>

          <p className="mt-1 text-sm text-muted-foreground">{leadLabel}</p>
        </div>

        {total > 0 && segments.length > 0 && (
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-primary/10">
            {segments.map((segment) => (
              <div
                key={segment.label}
                className={`h-full ${getSegmentFill(segment.tone)}`}
                style={{
                  width: `${clampPercent((segment.value / total) * 100)}%`,
                }}
              />
            ))}
          </div>
        )}

        <ul className="space-y-2.5">
          {segments.map((segment) => (
            <li
              key={segment.label}
              className="flex items-center gap-3 rounded-xl border border-border/50 px-3 py-2 text-sm"
            >
              <span
                className={`size-2.5 shrink-0 rounded-sm ${getSegmentFill(
                  segment.tone
                )}`}
              />

              <span className="truncate">{segment.label}</span>

              <span className="ml-auto font-semibold tabular-nums">
                {formatNumber(segment.value)}
              </span>

              <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {formatPercent(segment.value, total)}
              </span>
            </li>
          ))}
        </ul>

        {flags.map((flag) => (
          <div
            key={flag.label}
            className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5"
          >
            <AlertTriangle className="size-4 shrink-0 text-destructive" />

            <p className="truncate text-sm text-muted-foreground">
              {flag.label}
            </p>

            <span className="ml-auto text-sm font-semibold tabular-nums text-destructive">
              {formatNumber(flag.value)}
            </span>
          </div>
        ))}

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4">
          <p className="text-sm text-muted-foreground">{footerLabel}</p>
          <p className="text-sm font-semibold tabular-nums">{footerValue}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function TableCard({
  id,
  title,
  count,
  description,
  rows,
  emptyText,
  initialLimit = 8,
  tone = "default",
  className = "",
}: {
  id?: string
  title: string
  count: number
  description: string
  rows: AdminTableRow[]
  emptyText: string
  initialLimit?: number
  tone?: "default" | "warning" | "destructive"
  className?: string
}) {
  return (
    <Card
      id={id}
      className={`scroll-mt-24 overflow-hidden border-border/70 bg-card shadow-sm ${className}`}
    >
      <CardHeader className="space-y-2 border-b border-border/60 bg-background/20">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>

          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
              tone === "destructive"
                ? "bg-destructive/10 text-destructive"
                : tone === "warning"
                ? "bg-primary/10 text-primary"
                : "bg-primary/10 text-primary"
            }`}
          >
            {formatNumber(count)}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>

      <CardContent className="p-4">
        <div className="-mx-1 overflow-x-auto px-1">
          <AdminShowMoreTable
            rows={rows}
            emptyText={emptyText}
            initialLimit={initialLimit}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function toAdminTableRows(
  rows: SubscriptionRow[],
  profileMap: Map<string, ProfileRow>,
  authUserMap: Map<string, AuthUserRow>
): AdminTableRow[] {
  return rows.map((row) => {
    const profile = profileMap.get(row.user_id)
    const authUser = authUserMap.get(row.user_id)

    return {
      id: row.id,
      name: getDisplayName(profile, authUser),
      email: authUser?.email || "No email",
      phone: getDisplayPhone(profile, authUser),
      status: row.status || "unknown",
      recurringStatus: row.recurring_status || "unknown",
      expiresAt: row.expires_at
        ? new Date(row.expires_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: TIME_ZONE,
          })
        : "No expiry",
    }
  })
}

function getDisplayName(profile?: ProfileRow, authUser?: AuthUserRow) {
  return (
    profile?.full_name ||
    getMetadataValue(authUser, ["full_name", "name", "display_name"]) ||
    authUser?.email ||
    "Member"
  )
}

function getDisplayPhone(profile?: ProfileRow, authUser?: AuthUserRow) {
  return (
    profile?.phone ||
    authUser?.phone ||
    getMetadataValue(authUser, [
      "phone",
      "mobile",
      "mobile_number",
      "contact",
      "contact_number",
    ]) ||
    "No phone"
  )
}

function getMetadataValue(authUser: AuthUserRow | undefined, keys: string[]) {
  if (!authUser?.user_metadata) return null

  for (const key of keys) {
    const value = authUser.user_metadata[key]

    if (typeof value === "string" && value.trim()) {
      return value
    }
  }

  return null
}

function getDashboardPeriod(value: string | undefined): DashboardPeriod {
  if (value === "today" || value === "week" || value === "month") {
    return value
  }

  return "month"
}

function getDashboardPeriodWindow(period: DashboardPeriod, now: Date) {
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(todayStart.getDate() + 1)

  const mondayOffset = (todayStart.getDay() + 6) % 7
  const weekStart = new Date(todayStart)
  weekStart.setDate(todayStart.getDate() - mondayOffset)

  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(weekStart.getDate() + 7)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  if (period === "today") {
    return {
      periodStart: todayStart,
      periodEnd: tomorrowStart,
    }
  }

  if (period === "week") {
    return {
      periodStart: weekStart,
      periodEnd: nextWeekStart,
    }
  }

  return {
    periodStart: monthStart,
    periodEnd: nextMonthStart,
  }
}

function getDashboardPeriodShortLabel(period: DashboardPeriod) {
  if (period === "today") return "today"
  if (period === "week") return "this week"
  return "this month"
}

function getDashboardPeriodStatLabel(period: DashboardPeriod) {
  if (period === "today") return "Today"
  if (period === "week") return "This week"
  return "This month"
}

function getDashboardPeriodLabel(
  period: DashboardPeriod,
  periodStart: Date,
  now: Date
) {
  if (period === "today") {
    return now.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: TIME_ZONE,
    })
  }

  if (period === "week") {
    const weekEnd = new Date(periodStart)
    weekEnd.setDate(periodStart.getDate() + 6)

    const startLabel = periodStart.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: TIME_ZONE,
    })

    const endLabel = weekEnd.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: TIME_ZONE,
    })

    return `${startLabel} - ${endLabel}`
  }

  return now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  })
}

function getRowTime(row: SubscriptionRow) {
  return new Date(
    row.updated_at ?? row.created_at ?? row.expires_at ?? 0
  ).getTime()
}

function hasFutureExpiry(row: SubscriptionRow, now: Date) {
  if (!row.expires_at) return false
  return new Date(row.expires_at) > now
}

function getAmountInPaise(row: SubscriptionRow) {
  return row.amount_paid ?? row.amount_paise ?? 0
}

function getSegmentFill(tone: SegmentTone) {
  if (tone === "strong") return "bg-primary"
  if (tone === "muted") return "bg-primary/45"
  return "bg-primary/20"
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function formatNumber(value: number) {
  return value.toLocaleString("en-IN")
}

function formatPercent(value: number, total: number) {
  if (!total) return "0%"
  return `${Math.round((value / total) * 100)}%`
}

function formatCurrency(amountInPaise: number) {
  return `₹${Math.round(amountInPaise / 100).toLocaleString("en-IN")}`
}

function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatChartDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  })
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  })
}