import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { renderStubReportPdf } from "@/lib/report/render-pdf"
import { sendAuditReportEmail } from "@/lib/email/send-audit-report"
import type {
  ApproveDraftResponse,
  StubReportPayload,
} from "@/types/assessment"
import type { IdentityBlock, VerticalValue } from "@/lib/audit/types"

export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// POST /api/admin/report-drafts/[id]/approve
// Renders the stub payload to PDF, emails it, and marks the
// draft + submission as sent. On email failure, draft remains
// in 'draft' so it can be retried.
// ════════════════════════════════════════════════════════════

const idSchema = z.string().uuid()

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single()
  return profile?.role === "admin" ? user : null
}

function jsonErr(error: string, status: number) {
  const body: ApproveDraftResponse = { ok: false, error }
  return NextResponse.json(body, { status })
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) {
      return jsonErr("Unauthorized", 401)
    }

    const { id } = await params
    const idCheck = idSchema.safeParse(id)
    if (!idCheck.success) {
      return jsonErr("Draft not found", 404)
    }

    const admin = createAdminClient()

    const { data: draft, error: draftError } = await admin
      .from("report_drafts")
      .select("id, submission_id, status, payload")
      .eq("id", id)
      .maybeSingle()

    if (draftError) {
      console.error(
        "POST /api/admin/report-drafts/[id]/approve draft lookup error:",
        draftError,
      )
      return jsonErr("Failed to approve draft", 500)
    }

    if (!draft) {
      return jsonErr("Draft not found", 404)
    }

    if (draft.status !== "draft") {
      return jsonErr("Already reviewed.", 409)
    }

    const { data: submission, error: submissionError } = await admin
      .from("audit_submissions")
      .select(
        "id, full_name, business_name, email, phone, city, vertical",
      )
      .eq("id", draft.submission_id)
      .maybeSingle()

    if (submissionError) {
      console.error(
        "POST /api/admin/report-drafts/[id]/approve submission lookup error:",
        submissionError,
      )
      return jsonErr("Failed to approve draft", 500)
    }

    if (!submission) {
      return jsonErr("Submission not found", 404)
    }

    const identity: IdentityBlock = {
      full_name: submission.full_name,
      business_name: submission.business_name,
      email: submission.email,
      phone: submission.phone ?? "",
      city: submission.city ?? "",
      vertical: submission.vertical as VerticalValue,
    }

    let pdfBuffer: Buffer
    try {
      pdfBuffer = await renderStubReportPdf(
        draft.payload as StubReportPayload,
        identity,
      )
    } catch (renderErr) {
      console.error(
        "POST /api/admin/report-drafts/[id]/approve render error:",
        renderErr,
      )
      return jsonErr("Failed to render report", 500)
    }

    try {
      await sendAuditReportEmail({
        to: identity.email,
        name: identity.full_name,
        businessName: identity.business_name,
        pdfBuffer,
      })
    } catch (emailErr) {
      console.error(
        "POST /api/admin/report-drafts/[id]/approve email error:",
        emailErr,
      )
      // Leave draft.status = 'draft' so admin can retry.
      return jsonErr("Failed to send email", 500)
    }

    const reviewedAt = new Date().toISOString()

    const { error: draftUpdateError } = await admin
      .from("report_drafts")
      .update({
        status: "approved",
        reviewer_id: user.id,
        reviewed_at: reviewedAt,
      })
      .eq("id", id)

    if (draftUpdateError) {
      console.error(
        "POST /api/admin/report-drafts/[id]/approve draft update error:",
        draftUpdateError,
      )
      // Email already sent; surface as success-ish but log loudly.
    }

    const { error: submissionUpdateError } = await admin
      .from("audit_submissions")
      .update({
        report_status: "sent",
        report_status_changed_at: reviewedAt,
      })
      .eq("id", submission.id)

    if (submissionUpdateError) {
      console.error(
        "POST /api/admin/report-drafts/[id]/approve submission update error:",
        submissionUpdateError,
      )
    }

    const body: ApproveDraftResponse = { ok: true, email_sent: true }
    return NextResponse.json(body, { status: 200 })
  } catch (err) {
    console.error("POST /api/admin/report-drafts/[id]/approve error:", err)
    return jsonErr("Failed to approve draft", 500)
  }
}
