// 7 Forces Business Audit — server-side PDF report generator
// ════════════════════════════════════════════════════════════
// Streams a PDFKit document to a Buffer suitable for emailing
// or returning from an API route. No filesystem writes, no
// client-side imports — safe for Vercel Node runtime.

import PDFDocument from "pdfkit"
import { FORCE_KEYS, type ForceKey, type IdentityBlock } from "./types"
import type { AuditVerdict } from "./verdict"

export type GenerateAuditReportPdfInput = {
  identity: IdentityBlock
  verdict: AuditVerdict
  verticalLabel: string
  generatedAt: Date
}

// Local label map. `FORCE_LABELS` is exported from verdict.ts but
// duplicated here per spec, so this file owns its presentation.
const FORCE_LABELS: Record<ForceKey, string> = {
  identity: "Identity",
  x_factor: "X-Factor",
  marketing: "Marketing",
  sales: "Sales",
  financial: "Financial",
  optimisation: "Optimisation",
  scale: "Scale",
  owner_energy: "Owner Energy",
}

const BRAND_RED = "#E53935"
const TEXT_BLACK = "#111111"
const TEXT_GREY = "#555555"
const RULE_GREY = "#DDDDDD"
const BAR_BG = "#F1F1F1"

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function highestForce(verdict: AuditVerdict): ForceKey {
  let pick: ForceKey = FORCE_KEYS[0]
  let best = -Infinity
  for (const f of FORCE_KEYS) {
    const s = verdict.scores[f].score
    if (s > best) {
      best = s
      pick = f
    }
  }
  return pick
}

function lowestForce(verdict: AuditVerdict): ForceKey {
  let pick: ForceKey = FORCE_KEYS[0]
  let worst = Infinity
  for (const f of FORCE_KEYS) {
    const s = verdict.scores[f].score
    if (s < worst) {
      worst = s
      pick = f
    }
  }
  return pick
}

export async function generateAuditReportPdf(
  input: GenerateAuditReportPdfInput,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 })
    const chunks: Buffer[] = []

    doc.on("data", (c: Buffer) => chunks.push(c))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", (err: Error) => {
      console.error("[audit/pdf] PDF generation failed", err)
      reject(err)
    })

    const { identity, verdict, verticalLabel, generatedAt } = input
    const pageWidth = doc.page.width
    const leftMargin = doc.page.margins.left
    const rightMargin = doc.page.margins.right
    const contentWidth = pageWidth - leftMargin - rightMargin

    // ─── 1. Header ──────────────────────────────────────────
    doc
      .fillColor(BRAND_RED)
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("7 Forces Business Audit Report", { align: "left" })

    doc
      .moveDown(0.3)
      .fillColor(TEXT_BLACK)
      .font("Helvetica")
      .fontSize(12)
      .text(`Personalised report for ${identity.business_name}`)

    doc
      .moveDown(0.2)
      .fillColor(TEXT_GREY)
      .fontSize(10)
      .text(`Generated ${formatDate(generatedAt)}`)

    doc.moveDown(0.6)
    const ruleY = doc.y
    doc
      .strokeColor(RULE_GREY)
      .lineWidth(0.5)
      .moveTo(leftMargin, ruleY)
      .lineTo(pageWidth - rightMargin, ruleY)
      .stroke()
    doc.moveDown(0.8)

    // ─── 2. Founder details ────────────────────────────────
    sectionHeading(doc, "Founder details")
    detailRow(doc, "Name", identity.full_name)
    detailRow(doc, "Business", identity.business_name)
    detailRow(doc, "Email", identity.email)
    detailRow(doc, "WhatsApp", identity.phone)
    detailRow(doc, "City", identity.city)
    detailRow(doc, "Business type", verticalLabel)
    doc.moveDown(0.8)

    // ─── 3. The verdict ────────────────────────────────────
    sectionHeading(doc, "The verdict")
    doc
      .fillColor(BRAND_RED)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(verdict.focus_force_label, { continued: false })
    doc
      .moveDown(0.3)
      .fillColor(TEXT_BLACK)
      .font("Helvetica")
      .fontSize(11)
      .text(verdict.focus_reason, {
        width: contentWidth,
        align: "left",
        lineGap: 2,
      })

    if (verdict.context.stage_tag) {
      doc
        .moveDown(0.4)
        .fillColor(TEXT_GREY)
        .fontSize(10)
        .text(`Stage: ${verdict.context.stage_tag}`)
    }
    doc.moveDown(0.8)

    // ─── 4. 8 Forces score breakdown ───────────────────────
    sectionHeading(doc, "8 Forces score breakdown")

    const rowHeight = 22
    const labelWidth = 130
    const scoreWidth = 60
    const barX = leftMargin + labelWidth + scoreWidth
    const barMaxWidth = contentWidth - labelWidth - scoreWidth

    for (const force of FORCE_KEYS) {
      const isFocus = force === verdict.focus_force
      const score = verdict.scores[force].score
      const rowY = doc.y

      doc
        .font(isFocus ? "Helvetica-Bold" : "Helvetica")
        .fontSize(11)
        .fillColor(isFocus ? BRAND_RED : TEXT_BLACK)
        .text(FORCE_LABELS[force], leftMargin, rowY, { width: labelWidth })

      doc
        .font(isFocus ? "Helvetica-Bold" : "Helvetica")
        .fillColor(isFocus ? BRAND_RED : TEXT_BLACK)
        .text(`${score.toFixed(1)} / 5`, leftMargin + labelWidth, rowY, {
          width: scoreWidth,
        })

      // Bar
      const barHeight = 8
      const barY = rowY + 4
      doc
        .fillColor(BAR_BG)
        .rect(barX, barY, barMaxWidth, barHeight)
        .fill()

      const filled = Math.max(0, Math.min(1, score / 5)) * barMaxWidth
      doc
        .fillColor(isFocus ? BRAND_RED : TEXT_BLACK)
        .rect(barX, barY, filled, barHeight)
        .fill()

      doc.y = rowY + rowHeight
    }
    doc.moveDown(0.5)

    // ─── 5. Strongest / weakest force ──────────────────────
    sectionHeading(doc, "Strongest and weakest force")
    const top = highestForce(verdict)
    const bottom = lowestForce(verdict)
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(TEXT_BLACK)
      .text(
        `Strongest: ${FORCE_LABELS[top]} (${verdict.scores[top].score.toFixed(1)} / 5)`,
        { lineGap: 2 },
      )
    doc.text(
      `Weakest: ${FORCE_LABELS[bottom]} (${verdict.scores[bottom].score.toFixed(1)} / 5)`,
      { lineGap: 2 },
    )
    doc.moveDown(0.8)

    // ─── 6. What to focus on next ──────────────────────────
    sectionHeading(doc, "What to focus on next")
    doc
      .fillColor(BRAND_RED)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(verdict.named_move.title)

    doc
      .moveDown(0.2)
      .fillColor(TEXT_GREY)
      .font("Helvetica-Oblique")
      .fontSize(10)
      .text(`${verdict.named_move.force_label} — ${verdict.named_move.duration}`)

    doc
      .moveDown(0.4)
      .fillColor(TEXT_BLACK)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("The promise")
    doc
      .moveDown(0.15)
      .font("Helvetica")
      .fontSize(11)
      .fillColor(TEXT_BLACK)
      .text(verdict.named_move.promise, {
        width: contentWidth,
        align: "left",
        lineGap: 2,
      })

    doc
      .moveDown(0.5)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("The diagnosis")
    doc
      .moveDown(0.15)
      .font("Helvetica")
      .fontSize(11)
      .fillColor(TEXT_BLACK)
      .text(verdict.named_move.diagnosis, {
        width: contentWidth,
        align: "left",
        lineGap: 2,
      })
    doc.moveDown(0.8)

    // ─── 7. Signals ────────────────────────────────────────
    const { strengths, risks, blind_spots } = verdict.signals
    if (strengths.length > 0) {
      signalSection(doc, "Strengths", strengths.map((s) => s.text))
    }
    if (risks.length > 0) {
      signalSection(doc, "Risks", risks.map((r) => r.text))
    }
    if (blind_spots.length > 0) {
      signalSection(doc, "Blind spots", blind_spots.map((b) => b.text))
    }

    // ─── 8. Footer ─────────────────────────────────────────
    doc.moveDown(1)
    const footerY = doc.y
    doc
      .strokeColor(RULE_GREY)
      .lineWidth(0.5)
      .moveTo(leftMargin, footerY)
      .lineTo(pageWidth - rightMargin, footerY)
      .stroke()

    doc
      .moveDown(0.4)
      .fillColor(TEXT_GREY)
      .font("Helvetica-Oblique")
      .fontSize(9)
      .text("Generated by Superhuman Entrepreneur — Own Your Growth.", {
        align: "center",
      })

    doc.end()
  })
}

// ─── Drawing helpers ───────────────────────────────────────

type PdfDoc = InstanceType<typeof PDFDocument>

function sectionHeading(doc: PdfDoc, label: string): void {
  doc
    .fillColor(BRAND_RED)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(label)
  doc.moveDown(0.3)
}

function detailRow(doc: PdfDoc, label: string, value: string): void {
  const rowY = doc.y
  const leftMargin = doc.page.margins.left
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(TEXT_GREY)
    .text(label, leftMargin, rowY, { width: 110, continued: false })
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(TEXT_BLACK)
    .text(value, leftMargin + 110, rowY, {
      width: doc.page.width - leftMargin - doc.page.margins.right - 110,
    })
  doc.moveDown(0.2)
}

function signalSection(doc: PdfDoc, label: string, items: string[]): void {
  sectionHeading(doc, label)
  const leftMargin = doc.page.margins.left
  const contentWidth =
    doc.page.width - leftMargin - doc.page.margins.right - 12
  for (const text of items) {
    const rowY = doc.y
    doc
      .fillColor(BRAND_RED)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("•", leftMargin, rowY, { width: 10, continued: false })
    doc
      .fillColor(TEXT_BLACK)
      .font("Helvetica")
      .fontSize(11)
      .text(text, leftMargin + 12, rowY, {
        width: contentWidth,
        lineGap: 2,
      })
    doc.moveDown(0.3)
  }
  doc.moveDown(0.4)
}
