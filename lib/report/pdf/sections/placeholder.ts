// ════════════════════════════════════════════════════════════
// Placeholder section renderer
// ════════════════════════════════════════════════════════════
//
// Phase 4 spike: sections 5-15 land in the next turn after the
// look-and-feel on sections 1-4 is approved. Until then, each
// reserved page renders this placeholder so the PDF flips to
// the correct page count and the founder/admin can SEE the
// scaffolding.

import "server-only"
import {
  COLORS,
  PAGE,
  CONTENT_WIDTH,
  drawCard,
  drawSectionHeader,
} from "../utils"

export function renderPlaceholder(
  doc: PDFKit.PDFDocument,
  options: {
    sectionNumber: string // "§5"
    title: string
    plannedLength: string // "1.5 pages, ~430 words"
    purpose: string // 1-2 sentence purpose from the spec
  },
) {
  drawSectionHeader(doc, {
    sectionNumber: options.sectionNumber,
    title: options.title,
  })

  const xStart = PAGE.margin.left
  const y = doc.y + 60

  // Centered placeholder card
  const cardHeight = 220
  const cardY = y + 40
  drawCard(doc, {
    x: xStart,
    y: cardY,
    width: CONTENT_WIDTH,
    height: cardHeight,
    fillColor: COLORS.softOrange,
    borderColor: COLORS.orange,
    borderWidth: 1.25,
  })

  const padding = 28
  doc
    .font("Bold")
    .fontSize(9)
    .fillColor(COLORS.orange)
    .text("PHASE 4 SPIKE — SECTION SCAFFOLDED", xStart + padding, cardY + padding, {
      characterSpacing: 1.5,
    })

  doc
    .font("Bold")
    .fontSize(20)
    .fillColor(COLORS.textBlack)
    .text(options.title, xStart + padding, cardY + padding + 22, {
      width: CONTENT_WIDTH - 2 * padding,
    })

  doc
    .font("Regular")
    .fontSize(10.5)
    .fillColor(COLORS.textGrey)
    .text(
      `Planned: ${options.plannedLength}`,
      xStart + padding,
      doc.y + 4,
      { width: CONTENT_WIDTH - 2 * padding },
    )

  doc
    .font("Regular")
    .fontSize(11)
    .fillColor(COLORS.textBlack)
    .text(options.purpose, xStart + padding, doc.y + 14, {
      width: CONTENT_WIDTH - 2 * padding,
      lineGap: 3,
    })

  doc
    .font("Italic")
    .fontSize(9.5)
    .fillColor(COLORS.textLight)
    .text(
      "This section's renderer lands in the next build turn once Swastik approves the look-and-feel of §1-§4.",
      xStart + padding,
      cardY + cardHeight - padding - 26,
      { width: CONTENT_WIDTH - 2 * padding, lineGap: 2 },
    )
}
