// ════════════════════════════════════════════════════════════
// Long-form PDF — shared rendering primitives
// ════════════════════════════════════════════════════════════
//
// Branding + layout helpers used by every section renderer. Keeps
// section files focused on layout decisions, not pdfkit boilerplate.
//
// Server-only — pdfkit is a Node-runtime library.

import "server-only"
import path from "path"
import fs from "fs"
import type PDFDocument from "pdfkit"

// ─── Brand palette ───────────────────────────────────────────

export const COLORS = {
  brandRed: "#E53935",
  brandRedDark: "#B71C1C",
  textBlack: "#111111",
  textGrey: "#666666",
  textLight: "#9A9A9A",
  ruleGrey: "#DDDDDD",
  cardBorder: "#E6E6E6",
  lightGrey: "#F8F8F8",
  softRed: "#FFF5F5",
  softOrange: "#FFF8EE",
  softGreen: "#F2FAF3",
  orange: "#E88725",
  green: "#2E7D32",
  barBg: "#EEEEEE",
} as const

// ─── Page geometry ───────────────────────────────────────────

export const PAGE = {
  width: 595.28, // A4 in points
  height: 841.89,
  margin: { top: 48, bottom: 56, left: 54, right: 54 },
} as const

export const CONTENT_WIDTH = PAGE.width - PAGE.margin.left - PAGE.margin.right
export const CONTENT_HEIGHT = PAGE.height - PAGE.margin.top - PAGE.margin.bottom

// ─── Font loading ────────────────────────────────────────────

export type FontSet = {
  regular: string
  bold: string
  italic: string
}

function pickFont(candidates: string[]): string | null {
  for (const candidate of candidates) {
    const full = path.join(process.cwd(), candidate)
    if (fs.existsSync(full)) return full
  }
  return null
}

export function loadFonts(): FontSet {
  // Mirror the fallback chain in lib/audit/pdf.ts: prefer Inter, fall
  // back to Oswald (which IS shipped in public/fonts/), then to the
  // pdfkit built-in Helvetica as a last resort. registerFont accepts
  // both file paths AND built-in font names as src.
  const regular =
    pickFont(["public/fonts/Inter-Regular.ttf", "public/fonts/Inter.ttf"]) ??
    pickFont(["public/fonts/Oswald.ttf"]) ??
    "Helvetica"
  const bold =
    pickFont(["public/fonts/Inter-Bold.ttf", "public/fonts/Inter-SemiBold.ttf"]) ??
    pickFont(["public/fonts/Oswald.ttf"]) ??
    "Helvetica-Bold"
  const italic =
    pickFont(["public/fonts/Inter-Italic.ttf", "public/fonts/Inter-Regular.ttf"]) ??
    pickFont(["public/fonts/Oswald.ttf"]) ??
    "Helvetica-Oblique"
  return { regular, bold, italic }
}

// ─── Page master ─────────────────────────────────────────────
//
// Renders a small footer on every page: brand mark on the left,
// page number on the right, optional watermark in the middle.

export function drawPageFooter(
  doc: PDFKit.PDFDocument,
  options: {
    pageNumber: number
    totalPages: number
    watermark?: string | null
  },
) {
  const y = PAGE.height - 32
  doc.save()
  // Brand mark
  doc
    .font("Bold")
    .fontSize(8)
    .fillColor(COLORS.brandRed)
    .text("SCALE CODE DIAGNOSTIC", PAGE.margin.left, y, {
      width: CONTENT_WIDTH / 3,
      align: "left",
    })
  // Watermark (optional)
  if (options.watermark) {
    doc
      .font("Bold")
      .fontSize(8)
      .fillColor(COLORS.orange)
      .text(options.watermark, PAGE.margin.left + CONTENT_WIDTH / 3, y, {
        width: CONTENT_WIDTH / 3,
        align: "center",
      })
  }
  // Page number
  doc
    .font("Regular")
    .fontSize(8)
    .fillColor(COLORS.textLight)
    .text(
      `${options.pageNumber} of ${options.totalPages}`,
      PAGE.margin.left + (2 * CONTENT_WIDTH) / 3,
      y,
      { width: CONTENT_WIDTH / 3, align: "right" },
    )
  doc.restore()
}

// ─── Common drawing primitives ───────────────────────────────

export function drawHorizontalRule(
  doc: PDFKit.PDFDocument,
  y: number,
  options: { color?: string; width?: number } = {},
) {
  doc.save()
  doc
    .moveTo(PAGE.margin.left, y)
    .lineTo(PAGE.width - PAGE.margin.right, y)
    .lineWidth(options.width ?? 0.5)
    .strokeColor(options.color ?? COLORS.ruleGrey)
    .stroke()
  doc.restore()
}

export type CardOptions = {
  x: number
  y: number
  width: number
  height: number
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  radius?: number
  padding?: number
}

export function drawCard(doc: PDFKit.PDFDocument, opts: CardOptions) {
  const {
    x,
    y,
    width,
    height,
    fillColor = "#FFFFFF",
    borderColor = COLORS.cardBorder,
    borderWidth = 0.75,
    radius = 6,
  } = opts
  doc.save()
  doc
    .roundedRect(x, y, width, height, radius)
    .fillColor(fillColor)
    .fill()
    .roundedRect(x, y, width, height, radius)
    .lineWidth(borderWidth)
    .strokeColor(borderColor)
    .stroke()
  doc.restore()
}

// ─── Section header (used on every page) ─────────────────────

export function drawSectionHeader(
  doc: PDFKit.PDFDocument,
  options: {
    sectionNumber: string // e.g. "§1"
    title: string
    subtitle?: string
  },
) {
  const startY = PAGE.margin.top
  doc.save()
  // Section number — small, red
  doc
    .font("Bold")
    .fontSize(8.5)
    .fillColor(COLORS.brandRed)
    .text(options.sectionNumber.toUpperCase(), PAGE.margin.left, startY, {
      characterSpacing: 1.5,
    })
  // Title — big, dark
  doc
    .font("Bold")
    .fontSize(22)
    .fillColor(COLORS.textBlack)
    .text(options.title, PAGE.margin.left, startY + 14, {
      width: CONTENT_WIDTH,
    })
  if (options.subtitle) {
    doc
      .font("Regular")
      .fontSize(11)
      .fillColor(COLORS.textGrey)
      .text(options.subtitle, PAGE.margin.left, doc.y + 4, {
        width: CONTENT_WIDTH,
      })
  }
  doc.restore()
}

// ─── Score bar ───────────────────────────────────────────────
//
// Renders a 0-5 horizontal bar with optional target overlay.

export function drawScoreBar(
  doc: PDFKit.PDFDocument,
  options: {
    x: number
    y: number
    width: number
    height: number
    score: number // 0-5
    targetScore?: number | null
    barColor?: string
    bgColor?: string
    targetColor?: string
  },
) {
  const {
    x,
    y,
    width,
    height,
    score,
    targetScore,
    barColor = COLORS.brandRed,
    bgColor = COLORS.barBg,
    targetColor = COLORS.textGrey,
  } = options
  const clampedScore = Math.max(0, Math.min(5, score))
  const fillWidth = (clampedScore / 5) * width

  doc.save()
  // Background bar
  doc
    .roundedRect(x, y, width, height, height / 2)
    .fillColor(bgColor)
    .fill()
  // Filled portion
  if (fillWidth > 0) {
    doc
      .roundedRect(x, y, Math.max(fillWidth, height), height, height / 2)
      .fillColor(barColor)
      .fill()
  }
  // Target overlay line (vertical tick)
  if (targetScore != null) {
    const tx = x + Math.max(0, Math.min(5, targetScore)) / 5 * width
    doc
      .moveTo(tx, y - 2)
      .lineTo(tx, y + height + 2)
      .lineWidth(1)
      .strokeColor(targetColor)
      .stroke()
  }
  doc.restore()
}

// ─── Text helpers ────────────────────────────────────────────

export function rupees(amount: number, options: { compact?: boolean } = {}): string {
  if (!Number.isFinite(amount)) return "₹—"
  if (options.compact && Math.abs(amount) >= 1e7) {
    return `₹${(amount / 1e7).toFixed(amount % 1e7 === 0 ? 0 : 1)}Cr`
  }
  if (options.compact && Math.abs(amount) >= 1e5) {
    return `₹${(amount / 1e5).toFixed(amount % 1e5 === 0 ? 0 : 1)}L`
  }
  if (options.compact && Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}K`
  }
  return `₹${Math.round(amount).toLocaleString("en-IN")}`
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function formatLongDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function plusDays(d: Date, days: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + days)
  return result
}
