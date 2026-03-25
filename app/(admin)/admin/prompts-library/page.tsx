import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PromptLibraryForm } from "@/components/admin/PromptLibraryForm"
import { PromptLibraryTable } from "@/components/admin/PromptLibraryTable"
import type { PromptLibraryItem } from "@/types"

export default async function AdminPromptLibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/dashboard")

  const admin = createAdminClient()
  const { data: prompts } = await admin
    .from("prompt_library")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Prompt Library</h1>

      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm font-semibold">Add Prompt</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <PromptLibraryForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm font-semibold">All Prompts ({(prompts ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <PromptLibraryTable prompts={(prompts ?? []) as PromptLibraryItem[]} />
        </CardContent>
      </Card>
    </div>
  )
}
