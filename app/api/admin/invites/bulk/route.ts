import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { randomBytes, createHash } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimit } from "@/lib/rate-limit"
import { sendAssessmentInviteEmail } from "@/lib/email/send-assessment-invite"
import { VERTICALS } from "@/lib/audit/types"
import type {
  BulkInviteRequest,
  BulkInviteResponse,
  BulkInviteResult,
} from "@/types/assessment"

export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// POST /api/admin/invites/bulk
// Bulk-issue assessment invites from a CSV upload. Per-row
// granular results so the UI can show "23 created · 1 duplicate
// · 1 invalid · 0 failed". Each row is processed independently;
// one bad row doesn't fail the batch.
// ════════════════════════════════════════════════════════════

const PHONE_RE = /^[6-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VERTICAL_VALUES = new Set<string>(VERTICALS.map((v) => v.value))

const rowSchema = z.object({
  email: z.string(),
  full_name: z.string(),
  phone: z.string().optional(),
  vertical: z.string().optional(),
})

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
  send_emails: z.boolean().optional().default(true),
})

function jsonErr(error: string, status: number) {
  const body: BulkInviteResponse = { ok: false, error }
  return NextResponse.json(body, { status })
}

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

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function buildAppUrl(request: Request): string {
  const origin = request.headers.get("origin")
  return (
    origin ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "")
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) {
      return jsonErr("Unauthorized", 401)
    }

    // Admin-scoped rate-limit. Same caveat as the rest of the codebase:
    // the limiter is per-instance (Vercel) until Phase 3 swaps in a
    // shared store. 5 bulk requests / hour is still useful as a
    // first-line guard against fat-finger duplicate uploads.
    const { allowed } = rateLimit({
      key: `admin:invites:bulk:${user.id}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    })
    if (!allowed) {
      return jsonErr("Too many bulk requests. Please wait an hour.", 429)
    }

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return jsonErr("Invalid request", 400)
    }

    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return jsonErr("Invalid request body", 400)
    }

    const { rows, send_emails } = parsed.data as BulkInviteRequest & {
      send_emails: boolean
    }
    const admin = createAdminClient()
    const appUrl = buildAppUrl(request)

    const results: BulkInviteResult[] = []

    // Sequential processing keeps load on Supabase predictable and
    // gives the email-send loop natural backpressure. 500 rows max
    // takes ~30 seconds; that's an acceptable admin-side wait.
    for (const row of rows) {
      const email = (row.email ?? "").trim().toLowerCase()
      const full_name = (row.full_name ?? "").trim()
      const phone = (row.phone ?? "").trim()
      const vertical = (row.vertical ?? "").trim()

      // ── Validation ──
      if (!EMAIL_RE.test(email)) {
        results.push({
          email: row.email,
          full_name,
          status: "invalid",
          reason: "Invalid email",
        })
        continue
      }
      if (full_name.length < 2) {
        results.push({
          email,
          full_name,
          status: "invalid",
          reason: "Full name is required",
        })
        continue
      }
      const phoneClean = phone && PHONE_RE.test(phone) ? phone : null
      const verticalClean =
        vertical && VERTICAL_VALUES.has(vertical) ? vertical : null

      // ── Duplicate check ──
      const { data: existing, error: dupError } = await admin
        .from("assessment_invites")
        .select("id")
        .eq("email", email)
        .in("status", ["issued", "opened", "in_progress"])
        .limit(1)
        .maybeSingle()

      if (dupError) {
        console.error("bulk invites duplicate check error:", dupError)
        results.push({
          email,
          full_name,
          status: "error",
          reason: "Duplicate check failed",
        })
        continue
      }

      if (existing) {
        results.push({
          email,
          full_name,
          status: "duplicate",
          reason: "Active invite already exists for this email",
        })
        continue
      }

      // ── Issue ──
      const token = randomBytes(32).toString("base64url")
      const token_hash = hashToken(token)

      const { data: inserted, error: insertError } = await admin
        .from("assessment_invites")
        .insert({
          token_hash,
          email,
          full_name,
          phone: phoneClean,
          vertical: verticalClean,
          status: "issued",
          issued_by: user.id,
        })
        .select("id")
        .single()

      if (insertError || !inserted) {
        console.error("bulk invites insert error:", insertError)
        results.push({
          email,
          full_name,
          status: "error",
          reason: insertError?.message ?? "Insert failed",
        })
        continue
      }

      const link = `${appUrl}/assess/${token}`

      // ── Email send (best-effort) ──
      let email_sent = false
      if (send_emails) {
        try {
          await sendAssessmentInviteEmail({
            to: email,
            full_name,
            magic_link: link,
          })
          email_sent = true
        } catch (sendErr) {
          console.error("bulk invites send error:", sendErr)
          // Invite is created; admin can resend later from the list.
          email_sent = false
        }
      }

      results.push({
        email,
        full_name,
        status: "created",
        invite_id: inserted.id,
        // Only echo the plaintext link when we're NOT auto-emailing
        // (so the admin can copy + distribute themselves) or when the
        // email send failed (so the admin sees what didn't get out).
        link: !send_emails || !email_sent ? link : undefined,
        email_sent,
      })
    }

    const tallies = results.reduce(
      (acc, r) => {
        if (r.status === "created") acc.created++
        else if (r.status === "duplicate") acc.duplicates++
        else if (r.status === "invalid") acc.invalid++
        else acc.errors++
        return acc
      },
      { created: 0, duplicates: 0, invalid: 0, errors: 0 },
    )

    const response: BulkInviteResponse = {
      ok: true,
      results,
      ...tallies,
    }
    return NextResponse.json(response, { status: 200 })
  } catch (err) {
    console.error("POST /api/admin/invites/bulk error:", err)
    return jsonErr("Bulk invite failed", 500)
  }
}
