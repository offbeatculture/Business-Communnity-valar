import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArrowLeft, UploadCloud } from "lucide-react"
import { UploadRecordingClient } from "./UploadRecordingClient"

export default async function UploadRecordingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const allowed =
    profile?.role === "admin" || profile?.role === "recording_admin"

  if (!allowed) {
    redirect("/dashboard")
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-24 sm:pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
              <UploadCloud className="size-5 text-primary" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Breathwork Library
              </p>
              <h1 className="text-2xl font-bold tracking-tight">
                Upload Recording
              </h1>
            </div>
          </div>

          <p className="max-w-2xl text-sm text-muted-foreground">
            Add new YouTube recordings to the Breathwork Library. This page is
            restricted to recording upload access only.
          </p>
        </div>

        <Link href="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 size-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <UploadRecordingClient />
    </div>
  )
}