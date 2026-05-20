import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { AUDIT_QUESTIONS, VERTICAL_Q18 } from "@/lib/audit/questions"
import { VERTICALS } from "@/lib/audit/types"

// Q18 is vertical-conditional — exactly one of these 5 candidates
// is shown to a founder, picked by their vertical. The other 4 are
// not asked, so the server must not flag them as missing.
const Q18_CANDIDATE_IDS = new Set([
  "q18_monthly_churn",
  "q18_repeat_rate",
  "q18_aggregator_share",
  "q18_capacity_util",
  "q18_dso_days",
])

// ════════════════════════════════════════════════════════════
// POST /api/audit/submit
// Body: { identity: IdentityBlock, answers: AuditAnswers }
// Writes a row to audit_submissions via admin client (no auth required).
// ════════════════════════════════════════════════════════════

const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Invalid 10-digit Indian phone")
const emailSchema = z.string().email()
const verticalSchema = z.enum(VERTICALS.map((v) => v.value) as [string, ...string[]])

const identitySchema = z.object({
  full_name: z.string().min(2).max(80),
  business_name: z.string().min(2).max(120),
  phone: phoneSchema,
  email: emailSchema,
  city: z.string().max(80).optional().default(""),
  vertical: verticalSchema,
})

// Per-answer shape: lenient — we trust the form's choice/band/number constructions.
const answerSchema = z.object({
  value: z.union([z.string(), z.number()]),
  score: z.number().optional(),
  unit: z.string().optional(),
  confidence: z.enum(["sure", "approx", "guess"]).optional(),
  untracked: z.boolean().optional(),
})

const payloadSchema = z.object({
  identity: identitySchema,
  answers: z.record(z.string(), answerSchema),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = payloadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid submission", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const { identity, answers } = parsed.data

    // The one Q18 candidate this founder is expected to have answered,
    // based on their vertical. "other" → no Q18 expected.
    const expectedQ18 = VERTICAL_Q18[identity.vertical] ?? null

    // Check coverage: every diagnostic question shown to this founder
    // must have an answer. Q18 candidates that don't match the
    // founder's vertical are excluded (they were never asked).
    const missing = AUDIT_QUESTIONS.filter((q) => {
      if (Q18_CANDIDATE_IDS.has(q.id) && q.id !== expectedQ18) return false
      const a = answers[q.id]
      if (!a) return true
      // Number questions must have a finite numeric value
      if (q.input_type === "number") {
        if (typeof a.value !== "number" || !Number.isFinite(a.value)) return true
      }
      // Confidence-required questions must include confidence
      if (q.confidence_required && !a.confidence) return true
      return false
    })

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "Missing or incomplete answers",
          missing: missing.map((q) => q.id),
        },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    const { data, error } = await admin
      .from("audit_submissions")
      .insert({
        full_name: identity.full_name,
        business_name: identity.business_name,
        phone: identity.phone,
        email: identity.email,
        city: identity.city || null,
        vertical: identity.vertical,
        answers,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      console.error("POST /api/audit/submit insert error:", error)
      return NextResponse.json(
        { error: "Failed to save submission" },
        { status: 500 },
      )
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (err) {
    console.error("POST /api/audit/submit error:", err)
    return NextResponse.json(
      { error: "Failed to submit audit" },
      { status: 500 },
    )
  }
}
