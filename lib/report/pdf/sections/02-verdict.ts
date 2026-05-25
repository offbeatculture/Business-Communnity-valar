// ════════════════════════════════════════════════════════════
// Section 2: The 90-Second Verdict (1 page, ~280 words)
// ════════════════════════════════════════════════════════════
//
// One large sentence (24pt) — the whole verdict on one line.
// Below: 3 short paragraphs (strongest / weakest / single move).
// Footer: "If you do nothing else, do this:"

import "server-only"
import {
  COLORS,
  PAGE,
  CONTENT_WIDTH,
  drawCard,
  drawSectionHeader,
} from "../utils"
import type { LongFormReportPayload } from "../../long-form-types"

export function renderVerdict(
  doc: PDFKit.PDFDocument,
  payload: LongFormReportPayload,
) {
  const v = payload.section_02_verdict
  const xStart = PAGE.margin.left
  let y = PAGE.margin.top

  // Section header
  drawSectionHeader(doc, {
    sectionNumber: "§2",
    title: "The 90-Second Verdict",
    subtitle: "If you only have a minute, this is what your numbers say.",
  })

  y = doc.y + 32

  // ─── The headline sentence ─────────────────────────────────
  doc
    .font("Bold")
    .fontSize(20)
    .fillColor(COLORS.textBlack)
    .text(v.headline_sentence, xStart, y, {
      width: CONTENT_WIDTH,
      lineGap: 6,
    })
  y = doc.y + 30

  // ─── Three columns ─────────────────────────────────────────
  // Actually 3 stacked sections (column doesn't fit at this length).

  const paragraphs = [
    { label: "STRONGEST FORCE", body: v.strongest_paragraph, accent: COLORS.green },
    { label: "WEAKEST FORCE", body: v.weakest_paragraph, accent: COLORS.brandRed },
    { label: "THE SINGLE MOVE", body: v.single_move_paragraph, accent: COLORS.orange },
  ]

  for (const p of paragraphs) {
    // Accent label
    doc
      .font("Bold")
      .fontSize(9)
      .fillColor(p.accent)
      .text(p.label, xStart, y, { characterSpacing: 1.5 })
    y = doc.y + 6
    // Body
    doc
      .font("Regular")
      .fontSize(10.5)
      .fillColor(COLORS.textBlack)
      .text(p.body, xStart, y, {
        width: CONTENT_WIDTH,
        lineGap: 2,
      })
    y = doc.y + 16
  }

  // ─── Footer: If you do nothing else ────────────────────────
  const footerHeight = 56
  const footerY = PAGE.height - PAGE.margin.bottom - footerHeight - 20

  drawCard(doc, {
    x: xStart,
    y: footerY,
    width: CONTENT_WIDTH,
    height: footerHeight,
    fillColor: COLORS.softRed,
    borderColor: COLORS.brandRed,
    borderWidth: 1.25,
    radius: 6,
  })

  doc
    .font("Bold")
    .fontSize(8.5)
    .fillColor(COLORS.brandRed)
    .text("IF YOU DO NOTHING ELSE, DO THIS", xStart + 14, footerY + 12, {
      characterSpacing: 1.5,
    })

  doc
    .font("Bold")
    .fontSize(12)
    .fillColor(COLORS.textBlack)
    .text(v.if_you_do_nothing_else, xStart + 14, footerY + 28, {
      width: CONTENT_WIDTH - 28,
    })
}
