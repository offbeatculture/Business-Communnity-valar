import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { RejectDraftResponse } from "@/types/assessment"

export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// POST /api/admin/report-drafts/[id]/reject
// Body: { note: string } (>=5 chars). Marks draft 'rejected'
// and flips the parent submission's report_status to 'rejected'
// (a Phase 3 worker will requeue regeneration; for now it just
// sits).
// ════════════════════════════════════════════════════════════

const idSchema = z.string().uuid()

const bodySchema = z.object({
  note: z.string().min(5).max(2000),
})

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
  const body: RejectDraftResponse = { ok: false, error }
  return NextResponse.json(body, { status })
}

export async function POST(
  request: Request,
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

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return jsonErr("Invalid request", 400)
    }

    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return jsonErr("Invalid request", 400)
    }

    const { note } = parsed.data

    const admin = createAdminClient()

    const { data: draft, error: draftError } = await admin
      .from("report_drafts")
      .select("id, submission_id, status")
      .eq("id", id)
      .maybeSingle()

    if (draftError) {
      console.error(
        "POST /api/admin/report-drafts/[id]/reject draft lookup error:",
        draftError,
      )
      return jsonErr("Failed to reject draft", 500)
    }

    if (!draft) {
      return jsonErr("Draft not found", 404)
    }

    if (draft.status !== "draft") {
      return jsonErr("Already reviewed.", 409)
    }

    const reviewedAt = new Date().toISOString()

    const { error: updateError } = await admin
      .from("report_drafts")
      .update({
        status: "rejected",
        reviewer_id: user.id,
        reviewed_at: reviewedAt,
        review_note: note,
      })
      .eq("id", id)

    if (updateError) {
      console.error(
        "POST /api/admin/report-drafts/[id]/reject update error:",
        updateError,
      )
      return jsonErr("Failed to reject draft", 500)
    }

    const { error: submissionUpdateError } = await admin
      .from("audit_submissions")
      .update({
        report_status: "rejected",
        report_status_changed_at: reviewedAt,
      })
      .eq("id", draft.submission_id)

    if (submissionUpdateError) {
      console.error(
        "POST /api/admin/report-drafts/[id]/reject submission update error:",
        submissionUpdateError,
      )
      // Non-fatal: draft is recorded as rejected, status can be reconciled.
    }

    const body: RejectDraftResponse = { ok: true }
    return NextResponse.json(body, { status: 200 })
  } catch (err) {
    console.error("POST /api/admin/report-drafts/[id]/reject error:", err)
    return jsonErr("Failed to reject draft", 500)
  }
}
