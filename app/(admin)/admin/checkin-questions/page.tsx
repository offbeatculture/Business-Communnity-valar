import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { CheckinQuestionsClient } from "@/components/admin/CheckinQuestionsClient"
import type { CheckinQuestion } from "@/lib/checkin"

export default async function CheckinQuestionsPage() {
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

  const admin = createAdminClient()
  const { data } = await admin
    .from("checkin_questions")
    .select("*")
    .order("week_number", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true })

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check-in Questions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The daily practice questions members answer yes or no to.
        </p>
      </div>

      <CheckinQuestionsClient questions={(data ?? []) as CheckinQuestion[]} />
    </div>
  )
}
