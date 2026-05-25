// ============================================================
// /admin/assessment-reports/[draftId] — single draft preview.
//
// Server fetches the draft row + payload directly from Supabase using
// the admin client (no GET-by-id API in the contract; the row never
// leaves the admin surface). Renders the client preview which handles
// approve / reject and the keyboard hotkeys.
// ============================================================

import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { AssessmentReportPreview } from "@/components/admin/AssessmentReportPreview"
import type { ReportDraftStatus, StubReportPayload } from "@/types/assessment"

export const metadata = {
  title: "Review Draft — Admin",
}

type DraftRow = {
  id: string
  submission_id: string
  version: number
  status: ReportDraftStatus
  payload: StubReportPayload
  created_at: string
  reviewed_at: string | null
  review_note: string | null
}

export default async function ReviewDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
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

  const { draftId } = await params

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("report_drafts")
    .select(
      "id, submission_id, version, status, payload, created_at, reviewed_at, review_note",
    )
    .eq("id", draftId)
    .single()

  if (error || !data) {
    notFound()
  }

  const draft = data as unknown as DraftRow

  return (
    <AssessmentReportPreview
      draftId={draft.id}
      version={draft.version}
      status={draft.status}
      createdAt={draft.created_at}
      reviewedAt={draft.reviewed_at}
      reviewNote={draft.review_note}
      payload={draft.payload}
    />
  )
}
