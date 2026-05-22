import { NextResponse } from "next/server"
import { z } from "zod/v4"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeVerdict } from "@/lib/audit/verdict"
import { VERTICALS } from "@/lib/audit/types"
import type {
  AuditAnswers,
  IdentityBlock,
  VerticalValue,
} from "@/lib/audit/types"
import { generateAuditReportPdf } from "@/lib/audit/pdf"
import { sendAuditReportEmail } from "@/lib/email/send-audit-report"

// pdfkit (used by generateAuditReportPdf) requires Node APIs — not Edge.
export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// POST /api/audit/send-report
// Body: see bodySchema below. Recomputes the verdict server-side
// (ignoring any client-supplied `result`), renders the PDF, sends
// it via SES, and best-effort updates audit_submissions.email_sent
// when a submissionId is provided.
// ════════════════════════════════════════════════════════════

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  businessName: z.string().min(2).max(120),
  email: z.string().email(),
  whatsapp: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional()
    .default(""),
  city: z.string().max(80).optional().default(""),
  businessType: z.enum(VERTICALS.map((v) => v.value) as [string, ...string[]]),
  answers: z.record(
    z.string(),
    z.object({
      value: z.union([z.string(), z.number()]),
      score: z.number().optional(),
      unit: z.string().optional(),
      confidence: z.enum(["sure", "approx", "guess"]).optional(),
      untracked: z.boolean().optional(),
    }),
  ),
  result: z.unknown().optional(),
  submissionId: z.string().uuid().optional(),
})

function methodNotAllowed() {
  return NextResponse.json(
    { success: false, error: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } },
  )
}

export const GET = methodNotAllowed
export const PUT = methodNotAllowed
export const PATCH = methodNotAllowed
export const DELETE = methodNotAllowed

export async function POST(request: Request) {
  // 1) Parse + validate body. Don't leak zod issues to clients.
  let body: unknown
  try {
    body = await request.json()
  } catch (err) {
    console.error("POST /api/audit/send-report invalid JSON:", err)
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    )
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    console.error(
      "POST /api/audit/send-report validation failed:",
      parsed.error.issues,
    )
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    )
  }

  // 2) Env preflight — cheaper failure than rendering the PDF first.
  const {
    SES_SMTP_USERNAME,
    SES_SMTP_PASSWORD,
    SES_SMTP_HOST,
    SES_SMTP_PORT,
    SES_FROM_EMAIL,
  } = process.env
  if (
    !SES_SMTP_USERNAME &&
    !SES_SMTP_PASSWORD &&
    !SES_SMTP_HOST &&
    !SES_SMTP_PORT &&
    !SES_FROM_EMAIL
  ) {
    console.error(
      "POST /api/audit/send-report: SES_* env vars are all unset",
    )
    return NextResponse.json(
      { success: false, error: "Email service is not configured" },
      { status: 500 },
    )
  }

  const {
    name,
    businessName,
    email,
    whatsapp,
    city,
    businessType,
    answers,
    submissionId,
  } = parsed.data

  // The zod-validated `answers` shape (value+optional score/unit/confidence/untracked)
  // is structurally a superset of every concrete AuditAnswer variant
  // (Choice/Band/Number). The verdict engine reads `value`, optional `score`,
  // and optional `confidence/untracked` only — all present. Cast once here
  // so the rest of the file stays typed.
  const auditAnswers = answers as AuditAnswers

  // 3) Recompute verdict server-side. Any client-supplied `result` is ignored.
  const verdict = computeVerdict(auditAnswers)

  // 4) Resolve human label for the vertical. Fall back to raw value.
  const verticalLabel =
    VERTICALS.find((v) => v.value === businessType)?.label ?? businessType

  const identity: IdentityBlock = {
    full_name: name,
    business_name: businessName,
    email,
    phone: whatsapp ?? "",
    city: city ?? "",
    vertical: businessType as VerticalValue,
  }

  // 5) PDF + send. Wrap so we can record a clean error on the submission row.
  try {
    const pdfBuffer = await generateAuditReportPdf({
      identity,
      verdict,
      verticalLabel,
      generatedAt: new Date(),
    })

    await sendAuditReportEmail({
      to: email,
      name,
      businessName,
      pdfBuffer,
    })

    // Best-effort: mark the submission as emailed. Never let a DB
    // error change the email-success response the caller sees.
    if (submissionId) {
      try {
        const admin = createAdminClient()
        const { error: updateError } = await admin
          .from("audit_submissions")
          .update({ email_sent: true, email_error: null })
          .eq("id", submissionId)
        if (updateError) {
          console.error(
            "POST /api/audit/send-report: failed to mark email_sent=true",
            { submissionId, error: updateError },
          )
        }
      } catch (dbErr) {
        console.error(
          "POST /api/audit/send-report: unexpected DB error updating email_sent",
          { submissionId, error: dbErr },
        )
      }
    }

    return NextResponse.json(
      { success: true, message: "Audit report sent successfully" },
      { status: 200 },
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send report"
    console.error("POST /api/audit/send-report: send failure:", err)

    // Best-effort: record the failure on the submission row.
    if (submissionId) {
      try {
        const admin = createAdminClient()
        const truncated = message.slice(0, 500)
        const { error: updateError } = await admin
          .from("audit_submissions")
          .update({ email_sent: false, email_error: truncated })
          .eq("id", submissionId)
        if (updateError) {
          console.error(
            "POST /api/audit/send-report: failed to record email_error",
            { submissionId, error: updateError },
          )
        }
      } catch (dbErr) {
        console.error(
          "POST /api/audit/send-report: unexpected DB error recording email_error",
          { submissionId, error: dbErr },
        )
      }
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
