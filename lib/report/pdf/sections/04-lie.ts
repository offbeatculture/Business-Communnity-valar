// ════════════════════════════════════════════════════════════
// Section 4: The Lie You Hold (1.5 pages, ~430 words)
// ════════════════════════════════════════════════════════════
//
// Anti-padding rule #7: do NOT soft-pedal the Lie. Display type.
// Their data as evidence. Slight discomfort is the design.
// If this reads polite, it has failed.

import "server-only"
import {
  COLORS,
  PAGE,
  CONTENT_WIDTH,
  drawCard,
  drawSectionHeader,
} from "../utils"
import type { LongFormReportPayload } from "../../long-form-types"

export function renderLiePage1(
  doc: PDFKit.PDFDocument,
  payload: LongFormReportPayload,
) {
  const l = payload.section_04_lie
  const xStart = PAGE.margin.left

  drawSectionHeader(doc, {
    sectionNumber: "§4",
    title: "The Lie You Hold",
    subtitle:
      "Every founder we audit holds one of these. Yours, defended by your own data.",
  })

  let y = doc.y + 38

  // ─── Lie name (heavy serif callout) ────────────────────────
  doc
    .font("Bold")
    .fontSize(38)
    .fillColor(COLORS.brandRedDark)
    .text(l.lie_display_name, xStart, y, {
      width: CONTENT_WIDTH,
      lineGap: 4,
    })
  y = doc.y + 28

  // ─── Evidence header ───────────────────────────────────────
  doc
    .font("Bold")
    .fontSize(10.5)
    .fillColor(COLORS.textBlack)
    .text("Why we think you hold this", xStart, y, { width: CONTENT_WIDTH })
  y = doc.y + 14

  // ─── Evidence rows ─────────────────────────────────────────
  for (const ev of l.evidence) {
    doc
      .font("Bold")
      .fontSize(8.5)
      .fillColor(COLORS.brandRed)
      .text(ev.q_id.split("_")[0].toUpperCase(), xStart, y, {
        characterSpacing: 1,
      })

    doc
      .font("Bold")
      .fontSize(10.5)
      .fillColor(COLORS.textBlack)
      .text(`"${ev.founder_said}"`, xStart + 50, y, {
        width: CONTENT_WIDTH - 50,
        lineGap: 2,
      })
    y = doc.y + 3

    doc
      .font("Regular")
      .fontSize(9.5)
      .fillColor(COLORS.textGrey)
      .text(ev.inference, xStart + 50, y, {
        width: CONTENT_WIDTH - 50,
        lineGap: 2,
      })
    y = doc.y + 14
  }

  y += 12

  // ─── Cost paragraph ────────────────────────────────────────
  doc
    .font("Bold")
    .fontSize(10.5)
    .fillColor(COLORS.textBlack)
    .text("What it's costing you", xStart, y)
  y = doc.y + 8

  doc
    .font("Regular")
    .fontSize(10.5)
    .fillColor(COLORS.textBlack)
    .text(l.cost_paragraph, xStart, y, {
      width: CONTENT_WIDTH,
      lineGap: 3,
    })
}

export function renderLiePage2(
  doc: PDFKit.PDFDocument,
  payload: LongFormReportPayload,
) {
  const l = payload.section_04_lie
  const xStart = PAGE.margin.left

  drawSectionHeader(doc, {
    sectionNumber: "§4 (continued)",
    title: "The Contradiction",
    subtitle:
      "What you'd say if asked — and what your own numbers reply.",
  })

  let y = doc.y + 32

  // ─── 2-column "You say" vs "Your numbers say" ──────────────
  const colGap = 18
  const colWidth = (CONTENT_WIDTH - colGap) / 2
  const colHeight = 220

  // Left card: You say
  drawCard(doc, {
    x: xStart,
    y,
    width: colWidth,
    height: colHeight,
    fillColor: COLORS.lightGrey,
    borderColor: COLORS.cardBorder,
  })

  doc
    .font("Bold")
    .fontSize(9)
    .fillColor(COLORS.textGrey)
    .text("WHAT YOU'D SAY", xStart + 14, y + 14, {
      characterSpacing: 1.5,
    })

  doc
    .font("Italic")
    .fontSize(14)
    .fillColor(COLORS.textBlack)
    .text(`"${l.contradiction.you_say}"`, xStart + 14, y + 32, {
      width: colWidth - 28,
      lineGap: 4,
    })

  // Right card: Your numbers say
  const rightX = xStart + colWidth + colGap
  drawCard(doc, {
    x: rightX,
    y,
    width: colWidth,
    height: colHeight,
    fillColor: COLORS.softRed,
    borderColor: COLORS.brandRed,
    borderWidth: 1.25,
  })

  doc
    .font("Bold")
    .fontSize(9)
    .fillColor(COLORS.brandRed)
    .text("WHAT YOUR NUMBERS SAY", rightX + 14, y + 14, {
      characterSpacing: 1.5,
    })

  doc
    .font("Bold")
    .fontSize(14)
    .fillColor(COLORS.textBlack)
    .text(l.contradiction.your_numbers_say, rightX + 14, y + 32, {
      width: colWidth - 28,
      lineGap: 4,
    })
}
