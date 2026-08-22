"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ChartRow = {
  label: string
  value: number
}

type RevenueChartRow = {
  date: string
  revenue: number
}

type AdminAnalyticsChartsProps = {
  accessChart: ChartRow[]
  paymentChart: ChartRow[]
  renewalChart: ChartRow[]
  contentChart: ChartRow[]
  revenueChart: RevenueChartRow[]
  totalRevenue: string
  monthlyRevenue: string
}

const COLORS = ["#D4A936", "#22C55E", "#F59E0B", "#EF4444", "#38BDF8"]

export function AdminAnalyticsCharts({
  accessChart,
  paymentChart,
  renewalChart,
  contentChart,
  revenueChart,
  totalRevenue,
  monthlyRevenue,
}: AdminAnalyticsChartsProps) {
  return (
    <section
      id="analysis"
      className="scroll-mt-24 space-y-6 rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-5 border-b border-border/60 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Detailed View
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight">Analysis</h2>

          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Visual breakdown of revenue, access, payment status, renewals, and
            content activity.
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto">
          <div className="min-w-[190px] rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total Revenue
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {totalRevenue}
            </p>
          </div>

          <div className="min-w-[190px] rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              This Month
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {monthlyRevenue}
            </p>
          </div>
        </div>
      </div>

      <ChartBox
        title="Revenue Trend"
        description="Daily revenue trend for this month"
      >
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={revenueChart}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" />
            <YAxis
              allowDecimals={false}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip
              formatter={(value) => [
                `₹${Number(value).toLocaleString("en-IN")}`,
                "Revenue",
              ]}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#38BDF8"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartBox
          title="Access Overview"
          description="Active access vs expired users"
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={accessChart}
                dataKey="value"
                nameKey="label"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={4}
              >
                {accessChart.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox
          title="Payment Type"
          description="Recurring users vs manual/GPay users"
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={paymentChart}
                dataKey="value"
                nameKey="label"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={4}
              >
                {paymentChart.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox
          title="Renewal Overview"
          description="Upcoming renewals and new members"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={renewalChart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {renewalChart.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox
          title="Content Activity"
          description="Recordings, posts, comments and likes"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={contentChart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {contentChart.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
    </section>
  )
}

function ChartBox({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-border/70 bg-background/30 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}