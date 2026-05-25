import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type {
  ListReportDraftsResponse,
  ReportDraftRow,
} from "@/types/assessment"

export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// GET /api/admin/report-drafts — paginated admin review queue
// Default: oldest 'draft' rows first (FIFO).
// ════════════════════════════════════════════════════════════

const querySchema = z.object({
  status: z.enum(["draft", "approved", "rejected", "superseded"]).default("draft"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
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
  const body: ListReportDraftsResponse = { ok: false, error }
  return NextResponse.json(body, { status })
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) {
      return jsonErr("Unauthorized", 401)
    }

    const url = new URL(request.url)
    const parsed = querySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    })

    if (!parsed.success) {
      return jsonErr("Invalid query", 400)
    }

    const { status, limit, offset } = parsed.data

    const admin = createAdminClient()

    // Join with audit_submissions to get identity columns for the queue UI.
    const { data, error } = await admin
      .from("report_drafts")
      .select(
        `
        id,
        submission_id,
        version,
        status,
        generator,
        created_at,
        reviewed_at,
        review_note,
        submission:audit_submissions!report_drafts_submission_id_fkey (
          full_name,
          business_name,
          email,
          vertical
        )
      `,
      )
      .eq("status", status)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("GET /api/admin/report-drafts error:", error)
      return jsonErr("Failed to list drafts", 500)
    }

    type Row = {
      id: string
      submission_id: string
      version: number
      status: ReportDraftRow["status"]
      generator: ReportDraftRow["generator"]
      created_at: string
      reviewed_at: string | null
      review_note: string | null
      submission:
        | {
            full_name: string | null
            business_name: string | null
            email: string | null
            vertical: string | null
          }
        | Array<{
            full_name: string | null
            business_name: string | null
            email: string | null
            vertical: string | null
          }>
        | null
    }

    const rows: ReportDraftRow[] = ((data ?? []) as Row[]).map((row) => {
      const sub = Array.isArray(row.submission)
        ? row.submission[0] ?? null
        : row.submission
      return {
        id: row.id,
        submission_id: row.submission_id,
        version: row.version,
        status: row.status,
        generator: row.generator,
        founder_name: sub?.full_name ?? "",
        business_name: sub?.business_name ?? "",
        email: sub?.email ?? "",
        vertical: sub?.vertical ?? "",
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
        review_note: row.review_note,
      }
    })

    const body: ListReportDraftsResponse = { ok: true, drafts: rows }
    return NextResponse.json(body, { status: 200 })
  } catch (err) {
    console.error("GET /api/admin/report-drafts error:", err)
    return jsonErr("Failed to list drafts", 500)
  }
}
