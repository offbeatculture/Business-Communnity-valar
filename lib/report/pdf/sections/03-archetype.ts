// ════════════════════════════════════════════════════════════
// Section 3: Your Founder Archetype (2 pages, ~700 words)
// ════════════════════════════════════════════════════════════
//
// Page 1: archetype name (display type) + description + favourite move.
// Page 2: why-we-placed-you-here evidence + 2 runners-up + 2-axis grid.

import "server-only"
import {
  COLORS,
  PAGE,
  CONTENT_WIDTH,
  CONTENT_HEIGHT,
  drawCard,
  drawSectionHeader,
} from "../utils"
import type { LongFormReportPayload } from "../../long-form-types"

export function renderArchetypePage1(
  doc: PDFKit.PDFDocument,
  payload: LongFormReportPayload,
) {
  const a = payload.section_03_archetype
  const xStart = PAGE.margin.left

  drawSectionHeader(doc, {
    sectionNumber: "§3",
    title: "Your Founder Archetype",
    subtitle: "One of seven patterns we see in Indian SME founders.",
  })

  let y = doc.y + 38

  // ─── Archetype name (display type) ─────────────────────────
  doc
    .font("Bold")
    .fontSize(42)
    .fillColor(COLORS.brandRed)
    .text(a.archetype_display_name, xStart, y, {
      width: CONTENT_WIDTH,
      lineGap: 4,
    })
  y = doc.y + 26

  // ─── Description paragraph ─────────────────────────────────
  doc
    .font("Regular")
    .fontSize(11)
    .fillColor(COLORS.textBlack)
    .text(a.description_paragraph, xStart, y, {
      width: CONTENT_WIDTH,
      lineGap: 3,
      align: "left",
    })
  y = doc.y + 30

  // ─── Favourite move (callout) ──────────────────────────────
  const moveBoxHeight = 100
  drawCard(doc, {
    x: xStart,
    y,
    width: CONTENT_WIDTH,
    height: moveBoxHeight,
    fillColor: COLORS.softOrange,
    borderColor: COLORS.orange,
    borderWidth: 1.25,
  })

  doc
    .font("Bold")
    .fontSize(9)
    .fillColor(COLORS.orange)
    .text("THE MOVE THIS ARCHETYPE ALWAYS REACHES FOR", xStart + 16, y + 14, {
      characterSpacing: 1.5,
    })

  doc
    .font("Bold")
    .fontSize(13)
    .fillColor(COLORS.textBlack)
    .text(a.favourite_move, xStart + 16, y + 32, {
      width: CONTENT_WIDTH - 32,
      lineGap: 3,
    })

  // Italic footer line — same row as the move
  doc
    .font("Italic")
    .fontSize(9.5)
    .fillColor(COLORS.textGrey)
    .text(
      "—— and it's usually what's gotten you stuck.",
      xStart + 16,
      y + moveBoxHeight - 22,
      { width: CONTENT_WIDTH - 32, align: "right" },
    )
}

export function renderArchetypePage2(
  doc: PDFKit.PDFDocument,
  payload: LongFormReportPayload,
) {
  const a = payload.section_03_archetype
  const xStart = PAGE.margin.left

  drawSectionHeader(doc, {
    sectionNumber: "§3 (continued)",
    title: "Why we placed you here",
    subtitle: "Specific answers that pinned the pattern.",
  })

  let y = doc.y + 32

  // ─── Evidence list ─────────────────────────────────────────
  for (const ev of a.why_we_placed_you_here) {
    // Q-id chip
    doc
      .font("Bold")
      .fontSize(8.5)
      .fillColor(COLORS.brandRed)
      .text(ev.q_id.split("_")[0].toUpperCase(), xStart, y, {
        characterSpacing: 1,
      })

    // Founder's answer (bold)
    doc
      .font("Bold")
      .fontSize(10.5)
      .fillColor(COLORS.textBlack)
      .text(`"${ev.founder_said}"`, xStart + 50, y, {
        width: CONTENT_WIDTH - 50,
        lineGap: 2,
      })
    y = doc.y + 4

    // Why it matters
    doc
      .font("Regular")
      .fontSize(9.5)
      .fillColor(COLORS.textGrey)
      .text(ev.why_it_matters, xStart + 50, y, {
        width: CONTENT_WIDTH - 50,
        lineGap: 2,
      })
    y = doc.y + 14
  }

  y += 8

  // ─── 2-axis grid ───────────────────────────────────────────
  const gridSize = 200
  const gridX = xStart
  const gridY = y

  drawArchetypeGrid(doc, {
    x: gridX,
    y: gridY,
    size: gridSize,
    founderX: a.grid_position.x,
    founderY: a.grid_position.y,
  })

  // ─── Runners-up (right side of grid) ───────────────────────
  const runnersX = gridX + gridSize + 24
  const runnersWidth = CONTENT_WIDTH - gridSize - 24
  let runnersY = gridY

  doc
    .font("Bold")
    .fontSize(9)
    .fillColor(COLORS.textGrey)
    .text("ARCHETYPES YOU ALSO FLIRT WITH", runnersX, runnersY, {
      characterSpacing: 1.5,
    })
  runnersY = doc.y + 10

  for (const r of a.flirts_with) {
    doc
      .font("Bold")
      .fontSize(11)
      .fillColor(COLORS.textBlack)
      .text(r.display_name, runnersX, runnersY, { width: runnersWidth })
    runnersY = doc.y + 3

    doc
      .font("Regular")
      .fontSize(9.5)
      .fillColor(COLORS.textGrey)
      .text(r.ack_paragraph, runnersX, runnersY, {
        width: runnersWidth,
        lineGap: 2,
      })
    runnersY = doc.y + 14
  }
}

// ─── 2-axis grid visual ──────────────────────────────────────
//
// x-axis (horizontal): demand source
//   left  = founder chasing each deal
//   right = systemic pipeline
// y-axis (vertical, inverted): founder dependence
//   top    = high founder dependence
//   bottom = low founder dependence

function drawArchetypeGrid(
  doc: PDFKit.PDFDocument,
  opts: { x: number; y: number; size: number; founderX: number; founderY: number },
) {
  const { x, y, size, founderX, founderY } = opts

  doc.save()
  // Background grid
  doc
    .rect(x, y, size, size)
    .fillColor(COLORS.lightGrey)
    .fill()
  // Crosshair (centre lines)
  doc
    .moveTo(x + size / 2, y)
    .lineTo(x + size / 2, y + size)
    .lineWidth(0.5)
    .strokeColor(COLORS.ruleGrey)
    .stroke()
  doc
    .moveTo(x, y + size / 2)
    .lineTo(x + size, y + size / 2)
    .lineWidth(0.5)
    .strokeColor(COLORS.ruleGrey)
    .stroke()
  // Outer border
  doc
    .rect(x, y, size, size)
    .lineWidth(0.75)
    .strokeColor(COLORS.cardBorder)
    .stroke()

  // Founder dot
  const dotX = x + Math.max(0, Math.min(1, founderX)) * size
  const dotY = y + Math.max(0, Math.min(1, founderY)) * size
  doc
    .circle(dotX, dotY, 6)
    .fillColor(COLORS.brandRed)
    .fill()
  doc
    .circle(dotX, dotY, 6)
    .lineWidth(1.5)
    .strokeColor("#FFFFFF")
    .stroke()

  // Axis labels
  doc
    .font("Bold")
    .fontSize(8)
    .fillColor(COLORS.textGrey)
    .text("HIGH DEPENDENCE", x - 60, y, { width: 60, align: "right" })
    .text("LOW DEPENDENCE", x - 60, y + size - 8, { width: 60, align: "right" })
    .text("CHASING", x, y + size + 4, { width: 50, align: "left" })
    .text("SYSTEMIC", x + size - 50, y + size + 4, { width: 50, align: "right" })

  doc.restore()
}
