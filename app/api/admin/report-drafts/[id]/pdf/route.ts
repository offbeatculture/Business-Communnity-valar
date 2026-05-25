// ════════════════════════════════════════════════════════════
// GET /api/admin/report-drafts/[id]/pdf
// ════════════════════════════════════════════════════════════
//
// Renders the draft on demand and returns the PDF as a download.
// Lets the admin review the report layout without depending on
// SES delivery (which can drop into spam, lag, etc.). The draft
// status is NOT modified -- this is a read-only preview.

import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { renderLongFormReportPdfFromStub } from "@/lib/report/render-pdf"
import type { StubReportPayload } from "@/types/assessment"
import type { IdentityBlock, VerticalValue } from "@/lib/audit/types"

export const runtime = "nodejs"

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

function sanitiseFilename(name: string): string {
  const cleaned = (name ?? "")
    .replace(/[^A-Za-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
  return cleaned.length > 0
    ? `${cleaned}-scale-code-diagnostic.pdf`
    : "scale-code-diagnostic.pdf"
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 })
    }

    const admin = createAdminClient()

    const { data: draft, error: draftError } = await admin
      .from("report_drafts")
      .select("id, submission_id, payload")
      .eq("id", id)
      .maybeSingle()

    if (draftError || !draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 })
    }

    const { data: submission, error: subError } = await admin
      .from("audit_submissions")
      .select(
        "id, full_name, business_name, email, phone, city, vertical, answers",
      )
      .eq("id", draft.submission_id)
      .maybeSingle()

    if (subError || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      )
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
      pdfBuffer = await renderLongFormReportPdfFromStub({
        payload: draft.payload as StubReportPayload,
        identity,
        answers:
          (submission.answers as Record<string, unknown> | null) ?? {},
      })
    } catch (renderErr) {
      console.error(
        "GET /api/admin/report-drafts/[id]/pdf render error:",
        renderErr,
      )
      return NextResponse.json(
        { error: "Failed to render report" },
        { status: 500 },
      )
    }

    const filename = sanitiseFilename(submission.business_name)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("GET /api/admin/report-drafts/[id]/pdf error:", err)
    return NextResponse.json(
      { error: "Failed to render report" },
      { status: 500 },
    )
  }
}
