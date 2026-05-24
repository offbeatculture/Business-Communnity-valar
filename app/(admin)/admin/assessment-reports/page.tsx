// ============================================================
// /admin/assessment-reports — the approval queue.
//
// Server component: fetches the initial set of draft report rows
// directly via the admin Supabase client, hydrates the client queue,
// and lets the client take over for filtering / hotkey navigation.
//
// We hit the DB directly instead of looping back through our own
// HTTP API so the first paint is fully server-rendered. The client
// uses GET /api/admin/report-drafts when the filter changes.
// ============================================================

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { AssessmentReportsQueue } from "@/components/admin/AssessmentReportsQueue"
import type { ReportDraftRow } from "@/types/assessment"

export const metadata = {
  title: "Assessment Reports — Admin",
}

// The audit_submissions table stores identity as TOP-LEVEL columns
// (full_name, business_name, email, vertical), not as a JSONB `identity`
// blob. Make sure the Supabase join selects those columns directly.
type DraftJoinRow = {
  id: string
  submission_id: string
  version: number
  status: ReportDraftRow["status"]
  generator: ReportDraftRow["generator"]
  created_at: string
  reviewed_at: string | null
  review_note: string | null
  audit_submissions: {
    full_name: string | null
    business_name: string | null
    email: string | null
    vertical: string | null
  } | null
}

export default async function AssessmentReportsPage() {
  // Defence-in-depth — layout already enforces admin, but a direct
  // route-group misconfig should never expose this page.
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

  // FIFO order — oldest draft first so admins triage chronologically.
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("report_drafts")
    .select(
      "id, submission_id, version, status, generator, created_at, reviewed_at, review_note, audit_submissions ( full_name, business_name, email, vertical )",
    )
    .eq("status", "draft")
    .order("created_at", { ascending: true })
    .limit(100)

  if (error) {
    console.error("/admin/assessment-reports load error:", error)
  }

  const drafts: ReportDraftRow[] = ((data ?? []) as unknown as DraftJoinRow[])
    .map((row) => {
      const sub = row.audit_submissions
      return {
        id: row.id,
        submission_id: row.submission_id,
        version: row.version,
        status: row.status,
        generator: row.generator,
        founder_name: sub?.full_name ?? "Unknown founder",
        business_name: sub?.business_name ?? "Unknown business",
        email: sub?.email ?? "",
        vertical: sub?.vertical ?? "",
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
        review_note: row.review_note,
      }
    })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Assessment Reports</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Approve or reject long-form assessment drafts before they reach the
        founder&apos;s inbox.
      </p>

      <AssessmentReportsQueue initial={drafts} initialStatus="draft" />
    </div>
  )
}
