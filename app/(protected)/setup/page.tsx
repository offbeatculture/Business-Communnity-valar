import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileEditForm } from "@/components/profile/ProfileEditForm"
import type { Profile } from "@/types"

export default async function SetupPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!profile) {
    redirect("/profile/edit")
  }

  const isProfileComplete =
    !!profile.full_name?.trim() &&
    !!profile.phone?.trim() &&
    !!profile.city?.trim()

  if (isProfileComplete) {
    redirect("/dashboard")
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-2 text-2xl font-bold">Welcome to the Community!</h1>

      <p className="mb-6 text-sm text-muted-foreground">
        Complete your profile so other members can get to know you. This only
        takes a minute.
      </p>

      <ProfileEditForm profile={profile as Profile} redirectTo="/dashboard" />
    </div>
  )
}