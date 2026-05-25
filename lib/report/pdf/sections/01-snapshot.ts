// ════════════════════════════════════════════════════════════
// Section 1: The Snapshot (1 page, ~280 words)
// ════════════════════════════════════════════════════════════
//
// The wall page. Founder reads in 30 sec, knows the headline,
// can screenshot to spouse/co-founder. Everything below in the
// report is the DEFENCE of this one page.
//
// Layout (top → bottom):
//   - Brand strip
//   - Founder name + business + audit date + stage band
//   - 8-pillar depth bars with stage-target line overlaid
//   - 3 callout cards: Named Move / The Leak / The Lie

import "server-only"
import {
  COLORS,
  PAGE,
  CONTENT_WIDTH,
  drawCard,
  drawScoreBar,
} from "../utils"
import type { LongFormReportPayload } from "../../long-form-types"
import { FORCE_KEYS, type ForceKey } from "@/lib/audit/types"

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

export function renderSnapshot(
  doc: PDFKit.PDFDocument,
  payload: LongFormReportPayload,
) {
  const { meta, section_01_snapshot: s } = payload
  const xStart = PAGE.margin.left
  let y = PAGE.margin.top

  // ─── Brand strip (top) ─────────────────────────────────────
  doc
    .font("Bold")
    .fontSize(8.5)
    .fillColor(COLORS.brandRed)
    .text("SCALE CODE DIAGNOSTIC", xStart, y, { characterSpacing: 2 })

  doc
    .font("Regular")
    .fontSize(8.5)
    .fillColor(COLORS.textLight)
    .text(`Issued ${s.audit_date_label}`, xStart, y, {
      width: CONTENT_WIDTH,
      align: "right",
    })

  y += 28

  // ─── Identity block ────────────────────────────────────────
  doc
    .font("Bold")
    .fontSize(30)
    .fillColor(COLORS.textBlack)
    .text(meta.founder.full_name, xStart, y, { width: CONTENT_WIDTH })
  y = doc.y + 4

  doc
    .font("Regular")
    .fontSize(15)
    .fillColor(COLORS.textGrey)
    .text(meta.founder.business_name, xStart, y, { width: CONTENT_WIDTH })
  y = doc.y + 6

  // Vertical + stage band — single line, smaller
  doc
    .font("Regular")
    .fontSize(10)
    .fillColor(COLORS.textLight)
    .text(
      `${meta.vertical_label}   •   Stage: ${s.stage_band_label}`,
      xStart,
      y,
      { width: CONTENT_WIDTH },
    )
  y = doc.y + 24

  // ─── 8-pillar depth bars ───────────────────────────────────
  doc
    .font("Bold")
    .fontSize(9)
    .fillColor(COLORS.textGrey)
    .text("THE 8 FORCES — WHERE YOU ARE TODAY", xStart, y, {
      characterSpacing: 1.5,
    })
  y = doc.y + 12

  const barAreaHeight = 260
  const labelColWidth = 110
  const numberColWidth = 28
  const barColWidth =
    CONTENT_WIDTH - labelColWidth - numberColWidth - 16 // gutter

  const barHeight = 12
  const rowGap = (barAreaHeight - barHeight) / (FORCE_KEYS.length - 1)

  FORCE_KEYS.forEach((force, i) => {
    const rowY = y + i * rowGap
    const score = s.scores[force] ?? 0

    // Label
    doc
      .font("Regular")
      .fontSize(10.5)
      .fillColor(COLORS.textBlack)
      .text(FORCE_LABELS[force], xStart, rowY - 1, {
        width: labelColWidth,
      })

    // Bar
    drawScoreBar(doc, {
      x: xStart + labelColWidth + 8,
      y: rowY,
      width: barColWidth,
      height: barHeight,
      score,
      targetScore: s.stage_target_line,
    })

    // Number
    doc
      .font("Bold")
      .fontSize(10.5)
      .fillColor(COLORS.textBlack)
      .text(
        score.toFixed(1),
        xStart + labelColWidth + 8 + barColWidth + 8,
        rowY - 1,
        { width: numberColWidth, align: "right" },
      )
  })

  // Subtle target-line legend below bars
  const legendY = y + barAreaHeight + 4
  doc
    .font("Italic")
    .fontSize(8.5)
    .fillColor(COLORS.textLight)
    .text(
      `vertical line = stage target (${s.stage_target_line.toFixed(1)})`,
      xStart + labelColWidth + 8,
      legendY,
      { width: barColWidth, align: "left" },
    )

  // ─── 3 callout cards (bottom) ──────────────────────────────
  const cardsY = legendY + 26
  const cardGap = 12
  const cardWidth = (CONTENT_WIDTH - 2 * cardGap) / 3
  const cardHeight = 134

  // Card 1: The Named Move (brand red emphasis)
  drawCallout(doc, {
    x: xStart,
    y: cardsY,
    width: cardWidth,
    height: cardHeight,
    label: "THE NAMED MOVE",
    headline: s.named_move_callout.title,
    sub: s.named_move_callout.one_liner,
    accent: COLORS.brandRed,
    fill: COLORS.softRed,
  })

  // Card 2: The Leak (one number)
  drawCallout(doc, {
    x: xStart + cardWidth + cardGap,
    y: cardsY,
    width: cardWidth,
    height: cardHeight,
    label: s.the_leak_callout.label.toUpperCase(),
    headline: s.the_leak_callout.one_number,
    sub: s.the_leak_callout.sub,
    accent: COLORS.orange,
    fill: COLORS.softOrange,
  })

  // Card 3: The Lie
  drawCallout(doc, {
    x: xStart + 2 * (cardWidth + cardGap),
    y: cardsY,
    width: cardWidth,
    height: cardHeight,
    label: "THE LIE YOU HOLD",
    headline: s.the_lie_callout.name,
    sub: s.the_lie_callout.one_liner,
    accent: COLORS.textBlack,
    fill: COLORS.lightGrey,
  })
}

// ─── Local helper: callout card ──────────────────────────────

type CalloutOpts = {
  x: number
  y: number
  width: number
  height: number
  label: string
  headline: string
  sub: string
  accent: string
  fill: string
}

function drawCallout(doc: PDFKit.PDFDocument, opts: CalloutOpts) {
  drawCard(doc, {
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    fillColor: opts.fill,
    borderColor: opts.accent,
    borderWidth: 1.25,
    radius: 8,
  })

  const padX = 12
  const padY = 14
  const innerWidth = opts.width - 2 * padX

  // Label
  doc
    .font("Bold")
    .fontSize(8)
    .fillColor(opts.accent)
    .text(opts.label, opts.x + padX, opts.y + padY, {
      width: innerWidth,
      characterSpacing: 1.5,
    })

  // Headline
  doc
    .font("Bold")
    .fontSize(15)
    .fillColor(COLORS.textBlack)
    .text(opts.headline, opts.x + padX, opts.y + padY + 18, {
      width: innerWidth,
    })

  // Sub
  doc
    .font("Regular")
    .fontSize(9.5)
    .fillColor(COLORS.textGrey)
    .text(opts.sub, opts.x + padX, opts.y + opts.height - padY - 32, {
      width: innerWidth,
      height: 30,
      ellipsis: true,
    })
}
