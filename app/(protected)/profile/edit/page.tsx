import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ProfileEditForm } from "@/components/profile/ProfileEditForm"
import { ArrowLeft } from "lucide-react"
import type { Profile } from "@/types"

export default async function EditProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  const profile =
    existingProfile ??
    ({
      id: "",
      user_id: user.id,
      full_name:
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "",
      email: user.email ?? "",
      phone: "",
      city: "",
      bio: "",
      role: "member",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Profile)

  const { data: memberLevel } = await supabase
    .from("member_levels")
    .select("current_level")
    .eq("user_id", user.id)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/profile"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Profile
      </Link>

      <h1 className="mb-6 text-2xl font-bold">
        {existingProfile ? "Edit Profile" : "Set Up Profile"}
      </h1>

      <ProfileEditForm
        profile={profile}
        memberLevel={memberLevel?.current_level ?? 1}
      />
    </div>
  )
}