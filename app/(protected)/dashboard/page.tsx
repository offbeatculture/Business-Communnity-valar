import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Calendar,
  MessageSquare,
  Sparkles,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("user_id", user.id)
    .single()

  const firstName = profile?.full_name?.split(" ")[0] || "there"

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-24 text-[#4B3A25] sm:pb-10">
      <Card className="border-[#C89B3C]/20 bg-[#F7F0E3] text-[#4B3A25] shadow-lg shadow-black/5">
        <CardContent className="p-5 sm:p-7">
          <p className="text-sm font-medium text-[#8A6A22]">
            Daily Breathwork
          </p>

          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#4B3A25] sm:text-4xl">
            Welcome back, {firstName}
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#6F7358]">
            Continue your daily breathwork journey with practice prompts,
            guided resources, live sessions, and community reflections.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              asChild
              className="rounded-full bg-[#C89B3C] font-semibold text-[#122015] hover:bg-[#D8B76A]"
            >
              <Link href="/community">
                Go to Community <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="rounded-full border-[#C89B3C]/30 bg-transparent text-[#8A6A22] hover:bg-[#C89B3C]/10 hover:text-[#4B3A25]"
            >
              <Link href="/content">Open Library</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 font-serif text-2xl font-semibold text-[#4B3A25]">
          Start here
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            href="/content"
            icon={<BookOpen className="size-5 text-[#8A6A22]" />}
            title="Breathwork Library"
            description="Access practice guides, worksheets, and session recordings."
          />

          <DashboardCard
            href="/prompts"
            icon={<Sparkles className="size-5 text-[#8A6A22]" />}
            title="Practice Prompts"
            description="Use daily prompts for reflection and consistency."
          />

          <DashboardCard
            href="/assessment"
            icon={<ClipboardCheck className="size-5 text-[#8A6A22]" />}
            title="Self Check-ins"
            description="Reflect on your wellbeing and breathwork practice."
          />

          <DashboardCard
            href="/events"
            icon={<Calendar className="size-5 text-[#8A6A22]" />}
            title="Live Sessions"
            description="Join upcoming breathwork sessions and replays."
          />
        </div>
      </div>

      <Card className="border-[#C89B3C]/20 bg-[#F7F0E3] text-[#4B3A25] shadow-sm shadow-black/5">
        <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#C89B3C]/10">
            <MessageSquare className="size-8 text-[#C89B3C]" />
          </div>

          <h3 className="font-serif text-2xl font-semibold text-[#4B3A25]">
            Share your first reflection
          </h3>

          <p className="mt-2 max-w-md text-sm font-medium leading-6 text-[#6F7358]">
            Introduce yourself, share a practice win, ask a question, or write
            what shifted during your breathwork practice.
          </p>

          <Button
            asChild
            className="mt-5 rounded-full bg-[#C89B3C] font-semibold text-[#122015] hover:bg-[#D8B76A]"
          >
            <Link href="/community?compose=introduction">
              Introduce Yourself
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full border-[#C89B3C]/20 bg-[#F7F0E3] text-[#4B3A25] shadow-sm shadow-black/5 transition-all duration-200 hover:border-[#C89B3C]/40 hover:bg-[#FFF8EA] hover:shadow-md hover:shadow-black/10">
        <CardContent className="p-5">
          <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-[#C89B3C]/10">
            {icon}
          </div>

          <h3 className="font-serif text-xl font-semibold text-[#4B3A25]">
            {title}
          </h3>

          <p className="mt-2 text-sm font-medium leading-6 text-[#6F7358]">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}