import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileEditForm } from "@/components/profile/ProfileEditForm"
import type { Profile } from "@/types"

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) redirect("/login")

  // If profile is already complete, redirect to dashboard
  if (profile.business_name) {
    redirect("/dashboard")
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Welcome to the Community!</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Complete your profile so other members can get to know you. This only takes a minute.
      </p>

      <ProfileEditForm
        profile={profile as Profile}
        redirectTo="/dashboard"
      />
    </div>
  )
}
