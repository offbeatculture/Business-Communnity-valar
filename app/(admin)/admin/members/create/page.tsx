import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CreateMemberForm } from "@/components/admin/CreateMemberForm"
import { ArrowLeft } from "lucide-react"

export const metadata = { title: "Add Member" }

export default async function CreateMemberPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/dashboard")

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 pb-16">
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All members
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Member</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Creates the account, grants access, and emails a login link.
        </p>
      </div>

      <CreateMemberForm />
    </div>
  )
}
