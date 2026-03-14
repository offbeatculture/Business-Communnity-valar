import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ProfileEditForm } from "@/components/profile/ProfileEditForm"
import { ArrowLeft } from "lucide-react"
import type { Profile } from "@/types"

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) redirect("/login")

  const { data: memberLevel } = await supabase
    .from("member_levels")
    .select("current_level")
    .eq("user_id", user.id)
    .maybeSingle()

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        Back to Profile
      </Link>

      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>

      <ProfileEditForm
        profile={profile as Profile}
        memberLevel={memberLevel?.current_level ?? 1}
      />
    </div>
  )
}
