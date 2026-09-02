import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"

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

  if (profile?.role !== "admin") {
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
