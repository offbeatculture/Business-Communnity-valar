import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { canAccessConsole, isConsoleRole } from "@/lib/auth/console"

export default async function AdminLayout({
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

  // Staff get the console too, with a reduced nav. Per-page access is
  // enforced in each page and route handler as well — this only decides
  // who sees the shell at all.
  const role = profile?.role
  if (!isConsoleRole(role) || !canAccessConsole(role)) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar profile={profile} variant="admin" />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <TopBar profile={profile} />
        <main className="flex-1 p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}
