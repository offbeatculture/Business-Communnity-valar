// 7 Forces Business Audit — server-side PDF report generator
// Replace: lib/audit/pdf.ts

import PDFDocument from "pdfkit"
import path from "path"
import fs from "fs"
import { FORCE_KEYS, type ForceKey, type IdentityBlock } from "./types"
import type { AuditVerdict } from "./verdict"

export type GenerateAuditReportPdfInput = {
  identity: IdentityBlock
  verdict: AuditVerdict
  verticalLabel: string
  generatedAt: Date
  overlayContent?: string | null
  applicableVariants?: Array<{ label: string; body: string }>
  /** Pass the submitted audit answers from the API route so the snapshot can show revenue/headcount/margin/runway. */
  answers?: Record<string, unknown>
}

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
const TEXT_GREY = "#666666"
const TEXT_LIGHT = "#8A8A8A"
const RULE_GREY = "#DDDDDD"
const CARD_BORDER = "#E6E6E6"
const LIGHT_GREY = "#F8F8F8"
const SOFT_RED = "#FFF5F5"
const SOFT_ORANGE = "#FFF8EE"
const ORANGE = "#E88725"
const BAR_BG = "#EEEEEE"

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

export async function generateAuditReportPdf(
  input: GenerateAuditReportPdfInput,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const regularFont = pickFont([
      "public/fonts/Inter-Regular.ttf",
      "public/fonts/Inter.ttf",
      "public/fonts/Oswald.ttf",
    ])
    const boldFont = pickFont([
      "public/fonts/Inter-Bold.ttf",
      "public/fonts/Inter-SemiBold.ttf",
      "public/fonts/Oswald.ttf",
    ])
    const italicFont = pickFont([
      "public/fonts/Inter-Italic.ttf",
      "public/fonts/Inter-Regular.ttf",
      "public/fonts/Oswald.ttf",
    ])

    const doc = new PDFDocument({
      size: "A4",
      margins: {
       top: 42,
    bottom: 46,
    left: 36,
    right: 36,
      },
      font: regularFont,
      bufferPages: true,
      autoFirstPage: true,
    })

    doc.registerFont("Regular", regularFont)
    doc.registerFont("Bold", boldFont)
    doc.registerFont("Italic", italicFont)

    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const {
      identity,
      verdict,
      verticalLabel,
      generatedAt,
      overlayContent,
      applicableVariants = [],
      answers = {},
    } = input

    const verdictAny = verdict as unknown as Record<string, unknown>
    const namedMove = valueObject(verdictAny.named_move)

    // Header
    doc
      .fillColor(BRAND_RED)
      .font("Bold")
      .fontSize(21)
      .text("7 Forces Business Audit Report", { width: contentWidth(doc) })

    doc
      .moveDown(0.25)
      .fillColor(TEXT_BLACK)
      .font("Regular")
      .fontSize(11)
      .text(`Personalised report for ${safe(identity.business_name)}`)

    doc
      .moveDown(0.15)
      .fillColor(TEXT_LIGHT)
      .fontSize(9)
      .text(`Generated ${formatDate(generatedAt)}`)

    horizontalRule(doc)

    // Founder details
    sectionHeading(doc, "Founder details")
    renderDetailGrid(doc, [
      ["Name", identity.full_name],
      ["Business", identity.business_name],
      ["Email", identity.email],
      ["WhatsApp", identity.phone],
      ["City", identity.city],
      ["Business type", verticalLabel],
    ])

    // Verdict
    sectionHeading(doc, "The verdict")
    doc
      .fillColor(BRAND_RED)
      .font("Bold")
      .fontSize(17)
      .text(verdict.focus_force_label, { width: contentWidth(doc) })
    doc.moveDown(0.25)
    paragraph(doc, verdict.focus_reason, 10.8, TEXT_BLACK)

    if (verdict.context?.stage_tag) {
      doc
        .moveDown(0.25)
        .fillColor(TEXT_GREY)
        .font("Regular")
        .fontSize(9.5)
        .text(`Stage: ${verdict.context.stage_tag}`)
    }

    // Named move
    sectionHeading(doc, "Your named move")
    renderSimpleCard(doc, () => {
      doc
        .fillColor(TEXT_BLACK)
        .font("Bold")
        .fontSize(17)
        .text(verdict.named_move.title, { width: contentWidth(doc) - 28 })
      doc
        .moveDown(0.15)
        .fillColor(TEXT_GREY)
        .font("Italic")
        .fontSize(9.5)
        .text(`${verdict.named_move.force_label} — ${verdict.named_move.duration}`)
    })

    subHeading(doc, "The promise")
    paragraph(doc, verdict.named_move.promise, 10.8, TEXT_BLACK)

    subHeading(doc, "The diagnosis")
    paragraph(doc, verdict.named_move.diagnosis, 10.8, TEXT_BLACK)

    // Business type overlay
    const verticalInsight = firstNonEmptyString([
      overlayContent,
      getPath(verdictAny, ["vertical_recommendation"]),
      getPath(verdictAny, ["verticalRecommendation"]),
      getPath(verdictAny, ["vertical_insight"]),
      getPath(verdictAny, ["verticalInsight"]),
      getPath(namedMove, ["vertical_recommendation"]),
      getPath(namedMove, ["verticalRecommendation"]),
      getPath(namedMove, ["vertical_copy", verticalLabel]),
      getPath(namedMove, ["verticalCopy", verticalLabel]),
    ])

    if (verticalInsight) {
      renderCalloutCard(doc, `For your ${verticalLabel}`, verticalInsight, SOFT_RED, BRAND_RED)
    }

    // Moves
    const moves = extractMoves(namedMove, verdictAny)
    if (moves.length > 0) {
      sectionHeading(doc, "The moves")
      moves.forEach((move, index) => renderMoveBlock(doc, move, index + 1))
    }

    // Specific situation
    const situationTitle = firstNonEmptyString([
      getPath(verdictAny, ["situation_title"]),
      getPath(verdictAny, ["situationTitle"]),
      getPath(verdictAny, ["variant_title"]),
      getPath(verdictAny, ["variantTitle"]),
      getPath(namedMove, ["situation_title"]),
      getPath(namedMove, ["variant_title"]),
    ])

    const situationText = firstNonEmptyString([
      getPath(verdictAny, ["situation_specific"]),
      getPath(verdictAny, ["situationSpecific"]),
      getPath(verdictAny, ["specific_to_situation"]),
      getPath(verdictAny, ["specificToSituation"]),
      getPath(verdictAny, ["variant"]),
      getPath(verdictAny, ["variant_copy"]),
      getPath(verdictAny, ["variantCopy"]),
      getPath(namedMove, ["situation_specific"]),
      getPath(namedMove, ["specific_to_situation"]),
      getPath(namedMove, ["variant"]),
      getPath(namedMove, ["variant_copy"]),
    ])

    const variantCards =
      applicableVariants.length > 0
        ? applicableVariants
        : situationText
          ? [{ label: situationTitle || "Relevant variant", body: situationText }]
          : []

    if (variantCards.length > 0) {
      sectionHeading(doc, "Specific to your situation")
      for (const card of variantCards) {
        renderCalloutCard(doc, `Variant - ${card.label}`, card.body, SOFT_ORANGE, ORANGE)
      }
    }

    // Signals
    const { strengths, risks, blind_spots } = verdict.signals
    if (strengths.length || risks.length || blind_spots.length) {
      sectionHeading(doc, "What we saw")
      if (strengths.length) renderListBlock(doc, "Strengths", strengths.map((s) => s.text))
      if (risks.length) renderListBlock(doc, "Risks", risks.map((r) => r.text))
      if (blind_spots.length) renderListBlock(doc, "Blind spots", blind_spots.map((b) => b.text))
    }

    // Score breakdown
    sectionHeading(doc, "All 8 force scores")
    paragraph(
      doc,
      "Lowest = your focus force. When scores cluster within 0.3, foundation forces win unless your named bottleneck overrides.",
      9.2,
      TEXT_GREY,
    )
    doc.moveDown(0.25)
    renderScoreBreakdown(doc, verdict)

    // Strong / weak
    sectionHeading(doc, "Strongest and weakest force")
    const top = highestForce(verdict)
    const bottom = lowestForce(verdict)
    renderDetailGrid(doc, [
      ["Strongest", `${FORCE_LABELS[top]} (${verdict.scores[top].score.toFixed(1)} / 5)`],
      ["Weakest", `${FORCE_LABELS[bottom]} (${verdict.scores[bottom].score.toFixed(1)} / 5)`],
    ])

    // Snapshot
    const snapshot = extractSnapshot(identity, verdict, answers)
    if (snapshot.length > 0) {
      sectionHeading(doc, "Business snapshot")
      renderDetailGrid(doc, snapshot)
    }

    horizontalRule(doc)
    doc
      .fillColor(TEXT_LIGHT)
      .font("Italic")
      .fontSize(8.5)
      .text("Generated by Superhuman Entrepreneur — Own Your Growth.", {
        align: "center",
        width: contentWidth(doc),
      })

    addPageNumbers(doc)
    doc.end()
  })
}

type PdfDoc = InstanceType<typeof PDFDocument>

type MoveItem = {
  title: string
  timing?: string
  body: string
}

function sectionHeading(doc: PdfDoc, label: string): void {
  ensureSpace(doc, 36)
  doc.moveDown(0.75)
  doc
    .fillColor(BRAND_RED)
    .font("Bold")
    .fontSize(11.5)
    .text(label, { width: contentWidth(doc), characterSpacing: 0.4 })
  doc.moveDown(0.25)
}

function subHeading(doc: PdfDoc, label: string): void {
  ensureSpace(doc, 28)
  doc.moveDown(0.6)
  doc.fillColor(TEXT_BLACK).font("Bold").fontSize(11.5).text(label)
  doc.moveDown(0.15)
}

function paragraph(doc: PdfDoc, value: unknown, fontSize = 10.5, color = TEXT_BLACK): void {
  const text = cleanText(value)
  if (!text) return

  doc.font("Regular").fontSize(fontSize)
  ensureSpace(doc, Math.min(180, doc.heightOfString(text, { width: contentWidth(doc), lineGap: 3 }) + 12))
  doc
    .fillColor(color)
    .font("Regular")
    .fontSize(fontSize)
    .text(text, {
      width: contentWidth(doc),
      align: "left",
      lineGap: 3,
    })
}

function renderDetailGrid(doc: PdfDoc, rows: Array<[string, unknown]>): void {
  const left = doc.page.margins.left
  const width = contentWidth(doc)
  const labelWidth = 118
  const valueWidth = width - labelWidth

  for (const [label, rawValue] of rows) {
    const value = cleanText(rawValue) || "-"
    doc.font("Regular").fontSize(10)
    const valueHeight = doc.heightOfString(value, { width: valueWidth, lineGap: 2 })
    const rowHeight = Math.max(18, valueHeight + 4)
    ensureSpace(doc, rowHeight + 4)
    const y = doc.y

    doc
      .fillColor(TEXT_GREY)
      .font("Bold")
      .fontSize(9.5)
      .text(label, left, y, { width: labelWidth, lineBreak: false })

    doc
      .fillColor(TEXT_BLACK)
      .font("Regular")
      .fontSize(10)
      .text(value, left + labelWidth, y, { width: valueWidth, lineGap: 2 })

    doc.y = y + rowHeight
  }
}

function renderSimpleCard(doc: PdfDoc, renderInside: () => void): void {
  const left = doc.page.margins.left
  const width = contentWidth(doc)
  const padding = 14
  ensureSpace(doc, 80)
  const startPage = doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1
  const top = doc.y

  // Render first, then draw a background behind it on the same page.
  doc.x = left + padding
  doc.y = top + padding
  renderInside()
  const bottom = doc.y + padding
  const height = Math.max(64, bottom - top)

  if (doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1 === startPage) {
    doc.save()
    doc.roundedRect(left, top, width, height, 7).fillAndStroke(LIGHT_GREY, CARD_BORDER)
    doc.restore()
    // Re-render over the background.
    doc.x = left + padding
    doc.y = top + padding
    renderInside()
  }

  doc.x = left
  doc.y = top + height + 8
}

function renderCalloutCard(doc: PdfDoc, title: string, body: unknown, bgColor: string, accentColor: string): void {
  const cleanedBody = cleanText(body)
  if (!cleanedBody) return

  const left = doc.page.margins.left
  const width = contentWidth(doc)
  const padding = 14
  const bodyWidth = width - padding * 2

  doc.font("Regular").fontSize(10)
  const titleHeight = 16
  const bodyHeight = doc.heightOfString(cleanedBody, { width: bodyWidth, lineGap: 3 })
  const height = Math.max(88, titleHeight + bodyHeight + padding * 2 + 8)

  ensureSpace(doc, height + 10)
  const top = doc.y

  doc.roundedRect(left, top, width, height, 7).fillAndStroke(bgColor, accentColor)
  doc
    .fillColor(accentColor)
    .font("Bold")
    .fontSize(8.5)
    .text(cleanText(title).toUpperCase(), left + padding, top + padding, {
      width: bodyWidth,
      characterSpacing: 0.8,
    })

  doc
    .fillColor(TEXT_BLACK)
    .font("Regular")
    .fontSize(10)
    .text(cleanedBody, left + padding, top + padding + 22, {
      width: bodyWidth,
      lineGap: 3,
    })

  doc.y = top + height + 10
}

function renderMoveBlock(doc: PdfDoc, move: MoveItem, index: number): void {
  const left = doc.page.margins.left
  const width = contentWidth(doc)
  const padding = 13
  const bodyWidth = width - padding * 2
  const title = `${index}. ${move.title}${move.timing ? ` (${move.timing})` : ""}`
  const body = cleanText(move.body)

  doc.font("Regular").fontSize(10)
  const bodyHeight = doc.heightOfString(body, { width: bodyWidth, lineGap: 3 })
  const height = Math.max(76, bodyHeight + 52)

  ensureSpace(doc, height + 10)
  const top = doc.y

  doc.roundedRect(left, top, width, height, 6).fillAndStroke("#FFFFFF", CARD_BORDER)
  doc
    .fillColor(TEXT_BLACK)
    .font("Bold")
    .fontSize(10.5)
    .text(cleanText(title), left + padding, top + padding, { width: bodyWidth })

  doc
    .fillColor(TEXT_GREY)
    .font("Regular")
    .fontSize(10)
    .text(body, left + padding, top + padding + 22, {
      width: bodyWidth,
      lineGap: 3,
    })

  doc.y = top + height + 9
}

function renderListBlock(doc: PdfDoc, title: string, items: string[]): void {
  const cleaned = items.map(cleanText).filter(Boolean)
  if (!cleaned.length) return

  const left = doc.page.margins.left
  const width = contentWidth(doc)
  const padding = 13
  const bodyWidth = width - padding * 2
  const body = cleaned.map((item) => `• ${item}`).join("\n")

  doc.font("Regular").fontSize(10)
  const bodyHeight = doc.heightOfString(body, { width: bodyWidth, lineGap: 3 })
  const height = Math.max(72, bodyHeight + 48)

  ensureSpace(doc, height + 10)
  const top = doc.y

  doc.roundedRect(left, top, width, height, 6).fillAndStroke(LIGHT_GREY, CARD_BORDER)
  doc
    .fillColor(BRAND_RED)
    .font("Bold")
    .fontSize(10.5)
    .text(title, left + padding, top + padding, { width: bodyWidth })

  doc
    .fillColor(TEXT_BLACK)
    .font("Regular")
    .fontSize(10)
    .text(body, left + padding, top + padding + 22, {
      width: bodyWidth,
      lineGap: 3,
    })

  doc.y = top + height + 9
}

function renderScoreBreakdown(doc: PdfDoc, verdict: AuditVerdict): void {
  const left = doc.page.margins.left
  const width = contentWidth(doc)
  const labelWidth = 122
  const scoreWidth = 54
  const barWidth = width - labelWidth - scoreWidth - 8
  const rowHeight = 24

  for (const force of FORCE_KEYS) {
    ensureSpace(doc, rowHeight + 5)

    const y = doc.y
    const isFocus = force === verdict.focus_force
    const score = verdict.scores[force].score
    const label = `${FORCE_LABELS[force]}${isFocus ? "  focus" : ""}`

    if (isFocus) {
      doc.roundedRect(left - 4, y - 3, width + 8, rowHeight, 4).fill(SOFT_RED)
    }

    doc
      .fillColor(isFocus ? BRAND_RED : TEXT_BLACK)
      .font("Bold")
      .fontSize(9.5)
      .text(label, left, y, { width: labelWidth, lineBreak: false })

    const barX = left + labelWidth
    const barY = y + 11
    doc.fillColor(BAR_BG).rect(barX, barY, barWidth, 5).fill()
    doc
      .fillColor(isFocus ? BRAND_RED : "#B8B8B8")
      .rect(barX, barY, Math.max(0, Math.min(1, score / 5)) * barWidth, 5)
      .fill()

    doc
      .fillColor(TEXT_BLACK)
      .font("Regular")
      .fontSize(9.5)
      .text(`${score.toFixed(1)} / 5`, barX + barWidth + 8, y, {
        width: scoreWidth,
        align: "right",
        lineBreak: false,
      })

    doc.y = y + rowHeight
  }
}

function horizontalRule(doc: PdfDoc): void {
  doc.moveDown(0.75)
  const y = doc.y
  doc
    .strokeColor(RULE_GREY)
    .lineWidth(0.6)
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .stroke()
  doc.moveDown(0.65)
}

function ensureSpace(doc: PdfDoc, neededHeight: number): void {
  const bottom = doc.page.height - doc.page.margins.bottom - 14
  if (doc.y + neededHeight > bottom) doc.addPage()
}

function contentWidth(doc: PdfDoc): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right
}

function addPageNumbers(doc: PdfDoc): void {
  const range = doc.bufferedPageRange()
  const total = range.count

  for (let i = range.start; i < range.start + total; i++) {
    doc.switchToPage(i)
    doc
      .fillColor(TEXT_LIGHT)
      .font("Regular")
      .fontSize(8)
      .text(`Page ${i - range.start + 1} of ${total}`, doc.page.margins.left, doc.page.height - 38, {
        width: contentWidth(doc),
        align: "center",
        lineBreak: false,
      })
  }
}

function pickFont(relativePaths: string[]): string {
  for (const relativePath of relativePaths) {
    const absolutePath = path.join(process.cwd(), relativePath)
    if (fs.existsSync(absolutePath)) return absolutePath
  }
  throw new Error(`Missing PDF font. Add Inter-Regular.ttf inside public/fonts. Checked: ${relativePaths.join(", ")}`)
}

function highestForce(verdict: AuditVerdict): ForceKey {
  let pick: ForceKey = FORCE_KEYS[0]
  let best = -Infinity
  for (const force of FORCE_KEYS) {
    const score = verdict.scores[force].score
    if (score > best) {
      best = score
      pick = force
    }
  }
  return pick
}

function lowestForce(verdict: AuditVerdict): ForceKey {
  let pick: ForceKey = FORCE_KEYS[0]
  let worst = Infinity
  for (const force of FORCE_KEYS) {
    const score = verdict.scores[force].score
    if (score < worst) {
      worst = score
      pick = force
    }
  }
  return pick
}

function safe(value: unknown): string {
  return cleanText(value) || "-"
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value)
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/\r\n/g, "\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

function valueObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

function getPath(source: Record<string, unknown>, pathParts: string[]): unknown {
  let current: unknown = source
  for (const part of pathParts) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function firstNonEmptyString(values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && cleanText(value)) return cleanText(value)
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const objectValue = value as Record<string, unknown>
      const nested = firstNonEmptyString([
        objectValue.text,
        objectValue.body,
        objectValue.description,
        objectValue.copy,
        objectValue.content,
      ])
      if (nested) return nested
    }
  }
  return ""
}

function extractMoves(namedMove: Record<string, unknown>, verdict: Record<string, unknown>): MoveItem[] {
  const candidates = [
    namedMove.moves,
    namedMove.steps,
    namedMove.action_steps,
    namedMove.actionSteps,
    namedMove.actions,
    namedMove.playbook,
    namedMove.plan,
    namedMove.move_steps,
    namedMove.moveSteps,
    verdict.moves,
    verdict.steps,
    verdict.action_steps,
    verdict.actionSteps,
  ]

  for (const candidate of candidates) {
    if (!Array.isArray(candidate) || candidate.length === 0) continue

    const moves = candidate
      .map((item, index): MoveItem | null => {
        if (typeof item === "string") return { title: `Move ${index + 1}`, body: item }
        if (!item || typeof item !== "object") return null

        const objectItem = item as Record<string, unknown>
        const title = firstNonEmptyString([objectItem.title, objectItem.name, objectItem.label, objectItem.heading])
        const timing = firstNonEmptyString([objectItem.timing, objectItem.days, objectItem.duration, objectItem.when, objectItem.phase])
        const body = firstNonEmptyString([
          objectItem.body,
          objectItem.description,
          objectItem.text,
          objectItem.copy,
          objectItem.content,
          objectItem.detail,
        ])

        if (!title && !body) return null
        return { title: title || `Move ${index + 1}`, timing: timing || undefined, body }
      })
      .filter((move): move is MoveItem => Boolean(move))

    if (moves.length > 0) return moves
  }

  return []
}

function extractSnapshot(
  identity: IdentityBlock,
  verdict: AuditVerdict,
  answers: Record<string, unknown>,
): Array<[string, string]> {
  const out: Array<[string, string]> = []
  const identityAny = identity as unknown as Record<string, unknown>
  const context = valueObject((verdict as unknown as Record<string, unknown>).context)

  const answerValueByKey = (needles: string[]): string => {
    for (const [key, rawAnswer] of Object.entries(answers)) {
      const normalKey = key.toLowerCase()
      if (!needles.some((needle) => normalKey.includes(needle))) continue

      const answer = valueObject(rawAnswer)
      const value = answer.value ?? rawAnswer
      const unit = cleanText(answer.unit)
      const text = formatAnswerValue(value, unit)
      if (text) return text
    }
    return ""
  }

  const fields: Array<[string, unknown[]]> = [
    ["Revenue", [identityAny.revenue, identityAny.annual_revenue, context.revenue, context.annual_revenue, answerValueByKey(["revenue", "arr", "turnover"])]],
    ["Headcount", [identityAny.headcount, identityAny.team_size, context.headcount, context.team_size, answerValueByKey(["headcount", "team_size", "team"])]],
    ["Gross margin", [identityAny.gross_margin, identityAny.grossMargin, context.gross_margin, context.grossMargin, answerValueByKey(["gross_margin", "grossmargin", "margin"])]],
    ["Runway", [identityAny.runway, context.runway, context.cash_runway, answerValueByKey(["cash_runway", "runway"])]],
    ["Stage", [context.stage_tag, context.stage, identityAny.stage]],
  ]

  for (const [label, values] of fields) {
    const value = firstNonEmptyString(values)
    if (value) out.push([label, value])
  }

  return out
}

function formatAnswerValue(value: unknown, unit = ""): string {
  if (value === null || value === undefined || value === "") return ""

  const text = cleanText(value)
  if (!text) return ""

  const mapped: Record<string, string> = {
    lt_1: "Less than 1 month",
    "1_3": "1–3 months",
    "3_6": "3–6 months",
    gt_6: "More than 6 months",
    pre_1cr: "pre-1Cr",
    one_to_three_cr: "1–3Cr",
    three_to_ten_cr: "3–10Cr",
    ten_cr_plus: "10Cr+",
  }

  const finalText = mapped[text] ?? text.replace(/_/g, " ")
  return unit ? `${finalText} ${unit}` : finalText
}
