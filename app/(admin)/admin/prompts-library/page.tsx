import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PromptLibraryForm } from "@/components/admin/PromptLibraryForm"
import { PromptLibraryTable } from "@/components/admin/PromptLibraryTable"
import type { PromptLibraryItem } from "@/types"

export default async function AdminPromptLibraryPage() {
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

  const { data: prompts } = await admin
    .from("prompt_library")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-[#4B3A25]">
      <div>
        <p className="text-sm font-medium text-[#8A6A22]">
          Daily Breathwork Admin
        </p>

        <h1 className="font-serif text-3xl font-semibold text-[#4B3A25]">
          Practice Prompt Library
        </h1>

        <p className="mt-1 text-sm text-[#6F7358]">
          Add and manage breathwork reflection prompts for the Valarmathi
          community.
        </p>
      </div>

      <Card className="border-[#C89B3C]/20 bg-[#F7F0E3] text-[#4B3A25] shadow-sm shadow-black/5">
        <CardHeader className="px-4 pb-3 pt-4">
          <CardTitle className="font-serif text-lg font-semibold">
            Add Practice Prompt
          </CardTitle>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          <PromptLibraryForm />
        </CardContent>
      </Card>

      <Card className="border-[#C89B3C]/20 bg-[#F7F0E3] text-[#4B3A25] shadow-sm shadow-black/5">
        <CardHeader className="px-4 pb-3 pt-4">
          <CardTitle className="font-serif text-lg font-semibold">
            All Practice Prompts ({(prompts ?? []).length})
          </CardTitle>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          <PromptLibraryTable prompts={(prompts ?? []) as PromptLibraryItem[]} />
        </CardContent>
      </Card>
    </div>
  )
}