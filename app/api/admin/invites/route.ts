import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { randomBytes, createHash } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { VERTICALS } from "@/lib/audit/types"
import type {
  IssueInviteResponse,
  AssessmentInviteStatus,
} from "@/types/assessment"

// Node runtime — uses node:crypto.
export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// POST /api/admin/invites — issue a new assessment invite
// GET  /api/admin/invites — list invites (admin queue view)
// ════════════════════════════════════════════════════════════

const verticalSchema = z.enum(VERTICALS.map((v) => v.value) as [string, ...string[]])

const issueSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  vertical: verticalSchema.optional(),
})

const listQuerySchema = z.object({
  status: z
    .enum(["issued", "opened", "in_progress", "submitted", "expired", "revoked"])
    .optional(),
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

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const parsed = issueSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const { email, full_name, phone, vertical } = parsed.data

    const token = randomBytes(32).toString("base64url")
    const token_hash = hashToken(token)

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("assessment_invites")
      .insert({
        token_hash,
        email,
        full_name,
        phone: phone ?? null,
        vertical: vertical ?? null,
        status: "issued",
        issued_by: user.id,
      })
      .select("id")
      .single()

    if (error || !data) {
      console.error("POST /api/admin/invites insert error:", error)
      return NextResponse.json(
        { error: "Failed to issue invite" },
        { status: 500 },
      )
    }

    // Prefer the request's own origin so preview deployments issue
    // preview-domain links (instead of always pointing to prod via the
    // NEXT_PUBLIC_APP_URL env var, which is identical across all Vercel
    // environments). Falls back to the env var, then localhost.
    const requestOrigin = request.headers.get("origin")
    const appUrl =
      requestOrigin ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000"
    const link = `${appUrl.replace(/\/+$/, "")}/assess/${token}`

    const response: IssueInviteResponse = {
      invite_id: data.id,
      token,
      link,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    console.error("POST /api/admin/invites error:", err)
    return NextResponse.json(
      { error: "Failed to issue invite" },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const user = await verifyAdmin(supabase)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const parsed = listQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const { status, limit, offset } = parsed.data

    const admin = createAdminClient()
    let query = admin
      .from("assessment_invites")
      .select(
        "id, email, full_name, phone, vertical, status, opened_at, consumed_at, submission_id, expires_at, issued_by, notes, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq("status", status as AssessmentInviteStatus)
    }

    const { data, error } = await query

    if (error) {
      console.error("GET /api/admin/invites error:", error)
      return NextResponse.json(
        { error: "Failed to list invites" },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, invites: data ?? [] })
  } catch (err) {
    console.error("GET /api/admin/invites error:", err)
    return NextResponse.json(
      { error: "Failed to list invites" },
      { status: 500 },
    )
  }
}
