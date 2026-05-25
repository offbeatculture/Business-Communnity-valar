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
import type { AuditVerdict } from "@/lib/audit/verdict"
import type { PlaybookVariant } from "@/lib/audit/playbook"
import { generateAuditReportPdf } from "@/lib/audit/pdf"
import { sendAuditReportEmail } from "@/lib/email/send-audit-report"
import { getOverlay } from "@/lib/audit/playbook-overlays"

// pdfkit requires Node APIs — not Edge.
export const runtime = "nodejs"

// ════════════════════════════════════════════════════════════
// POST /api/audit/send-report
// Recomputes the verdict server-side, renders the PDF,
// sends it via SES, and best-effort updates audit_submissions.
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
  // 1) Parse request body
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

  // 2) SES env validation
  const {
    SES_SMTP_USERNAME,
    SES_SMTP_PASSWORD,
    SES_SMTP_HOST,
    SES_SMTP_PORT,
    SES_FROM_EMAIL,
  } = process.env

  if (
    !SES_SMTP_USERNAME ||
    !SES_SMTP_PASSWORD ||
    !SES_SMTP_HOST ||
    !SES_SMTP_PORT ||
    !SES_FROM_EMAIL
  ) {
    console.error("POST /api/audit/send-report: missing SES env vars")

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

  // 3) Recompute verdict server-side
  const auditAnswers = answers as AuditAnswers
  const verdict = computeVerdict(auditAnswers)

  // 4) Resolve vertical label
  const vertical = businessType as VerticalValue

  const verticalLabel =
    VERTICALS.find((v) => v.value === vertical)?.label ?? businessType

  const identity: IdentityBlock = {
    full_name: name,
    business_name: businessName,
    email,
    phone: whatsapp ?? "",
    city: city ?? "",
    vertical,
  }

  // 5) Build the same extra report data used on the results page
  const overlay = getOverlay(businessType as VerticalValue, verdict.focus_force)

  const applicableVariants = matchApplicableVariants(verdict, auditAnswers)

  // 6) Generate PDF + send email
  try {
const pdfBuffer = await generateAuditReportPdf({
  identity,
  verdict,
  verticalLabel,
  generatedAt: new Date(),
  overlayContent: overlay?.content ?? null,
  applicableVariants: applicableVariants.map((v) => ({
    label: v.label,
    body: v.body,
  })),
  answers: auditAnswers,
})

    await sendAuditReportEmail({
      to: email,
      name,
      businessName,
      pdfBuffer,
    })

    // Best-effort: mark submission as emailed
    if (submissionId) {
      try {
        const admin = createAdminClient()

        const { error: updateError } = await admin
          .from("audit_submissions")
          .update({
            email_sent: true,
            email_error: null,
          })
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
      {
        success: true,
        message: "Audit report sent successfully",
      },
      { status: 200 },
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send report"

    console.error("POST /api/audit/send-report: send failure:", err)

    // Best-effort: record email failure
    if (submissionId) {
      try {
        const admin = createAdminClient()
        const truncated = message.slice(0, 500)

        const { error: updateError } = await admin
          .from("audit_submissions")
          .update({
            email_sent: false,
            email_error: truncated,
          })
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
      {
        success: false,
        error: message,
      },
      { status: 500 },
    )
  }
}

// ════════════════════════════════════════════════════════════
// Same variant matching logic used by /audit/results/[id]
// ════════════════════════════════════════════════════════════

function matchApplicableVariants(
  verdict: AuditVerdict,
  answers: AuditAnswers,
): PlaybookVariant[] {
  const focus = verdict.focus_force
  const variants = verdict.named_move.variants

  if (!variants || variants.length === 0) return []

  const numValue = (qid: string): number | null => {
    const answer = answers[qid]
    if (!answer || !("value" in answer)) return null

    return typeof answer.value === "number" ? answer.value : null
  }

  const isUntracked = (qid: string): boolean => {
    const answer = answers[qid]
    return !!(answer && "untracked" in answer && answer.untracked)
  }

  const choiceValue = (qid: string): string | null => {
    const answer = answers[qid]
    if (!answer || !("value" in answer)) return null

    return typeof answer.value === "string" ? answer.value : null
  }

  return variants.filter((variant) => {
    const label = variant.label.toLowerCase()

    if (focus === "x_factor" && label.includes("60%")) {
      const concentration = numValue("q3_top3_concentration")
      return concentration !== null && concentration >= 60
    }

    if (focus === "marketing" && label.includes("cpl or conversion")) {
      return isUntracked("q5_cpl") || isUntracked("q6_conversion")
    }

    if (focus === "sales" && label.includes("conversion")) {
      return isUntracked("q6_conversion")
    }

    if (focus === "financial" && label.includes("runway")) {
      const runway = answers["q10_cash_runway"]
      const runwayValue =
        runway && "value" in runway ? String(runway.value) : null

      return (
        isUntracked("q10_cash_runway") ||
        runwayValue === "lt_1" ||
        runwayValue === "1_3"
      )
    }

    if (focus === "financial" && label.includes("margin")) {
      return isUntracked("q9_gross_margin")
    }

    if (focus === "optimisation" && label.includes("solo")) {
      const headcount = numValue("q12_headcount")
      return headcount !== null && headcount <= 1
    }

    if (focus === "scale") {
      const bottleneck = choiceValue("q13_bottleneck")

      if (label.includes("owner_time")) return bottleneck === "owner_time"
      if (label.includes("team")) return bottleneck === "team"
      if (label.includes("systems")) return bottleneck === "systems"
      if (label.includes("cash or supply")) {
        return bottleneck === "cash" || bottleneck === "supply"
      }
    }

    if (focus === "owner_energy" && label.includes("done")) {
      return choiceValue("q14_owner_energy") === "done"
    }

    return false
  })
}