import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { VisitTracker } from "@/components/engagement/VisitTracker"
import { MobileNav } from "@/components/layout/MobileNav"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("user_id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#E8DDC8] text-[#4B3A25]">
      <VisitTracker />

      <Sidebar profile={profile} />

      <div className="flex min-h-screen flex-col md:pl-64">
        <TopBar profile={profile} />

        <main className="flex-1 bg-[#E8DDC8] p-4 pb-20 text-[#4B3A25] sm:p-6 md:pb-6">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  )
}