// ════════════════════════════════════════════════════════════
// Long-form Scale Code Diagnostic — 20-page PDF composer
// ════════════════════════════════════════════════════════════
//
// Takes a fully-populated LongFormReportPayload, renders the
// 20-page PDF, returns a Buffer ready for SES attachment or
// preview download.
//
// Phase 4 spike: only §1-§4 are fully implemented. §5-§15 +
// appendices render placeholder pages so the document is the
// correct page count and the structure can be evaluated.

import "server-only"
import PDFDocument from "pdfkit"
import { loadFonts, drawPageFooter, PAGE } from "./utils"
import type { LongFormReportPayload } from "../long-form-types"
import { renderSnapshot } from "./sections/01-snapshot"
import { renderVerdict } from "./sections/02-verdict"
import {
  renderArchetypePage1,
  renderArchetypePage2,
} from "./sections/03-archetype"
import {
  renderLiePage1,
  renderLiePage2,
} from "./sections/04-lie"
import { renderPlaceholder } from "./sections/placeholder"

// Page count target = 20.
// §1 (1) + §2 (1) + §3 (2) + §4 (2 — second page is the 0.5 carryover)
// + §5-§15 placeholders + appendix A + appendix B = 20 expected.
//
// Spec breakdown (so the placeholder pages can describe themselves):

const PLACEHOLDERS = [
  {
    sectionNumber: "§5",
    title: "Stage Placement on the Scale Code",
    plannedLength: "1.5 pages, ~430 words",
    purpose:
      "Place this founder on 1 of 7 stages (SPARK → LEGACY) with identity arc, core constraint, and 3 graduation criteria.",
  },
  {
    sectionNumber: "§5 (continued)",
    title: "Stage — graduation criteria",
    plannedLength: "0.5 page",
    purpose:
      "What graduation to the next stage looks like, measurable. The next milestone.",
  },
  {
    sectionNumber: "§6",
    title: "The 8-Force Scorecard",
    plannedLength: "3 pages, ~850 words",
    purpose:
      "Force-by-force scorecard with score, sector-band benchmark, one-sentence verdict per force. Page 1 carries an 8-axis radar chart (founder vs vertical median).",
  },
  {
    sectionNumber: "§6 (continued)",
    title: "Scorecard — Forces 4 to 6",
    plannedLength: "1 page",
    purpose:
      "Sales, Financial, Optimisation blocks with score / band / driving answer.",
  },
  {
    sectionNumber: "§6 (continued)",
    title: "Scorecard — Forces 7 to 8",
    plannedLength: "1 page",
    purpose:
      "Scale + Owner Energy blocks. Closing summary across all 8.",
  },
  {
    sectionNumber: "§7",
    title: "The Named Move (90-Day Sprint)",
    plannedLength: "2 pages, ~600 words",
    purpose:
      "The single prescription: sprint name, target metric, diagnosis, week-by-week, Stop-Doing list.",
  },
  {
    sectionNumber: "§7 (continued)",
    title: "Named Move — weeks + Stop-Doing",
    plannedLength: "1 page",
    purpose:
      "4-week mini-timeline (Diagnose / Intervene / Scale / Lock) + 3-5 item Stop-Doing list.",
  },
  {
    sectionNumber: "§8",
    title: "Vertical Benchmarks — How You Compare",
    plannedLength: "1.5 pages, ~430 words",
    purpose:
      "6-row comparison table: your number vs vertical median vs top quartile. Outlier paragraphs.",
  },
  {
    sectionNumber: "§9",
    title: "The Cash Mirror — Your Own Numbers",
    plannedLength: "2 pages, ~580 words",
    purpose:
      "₹100 traceability waterfall: revenue → delivery cost → GM → marketing → net contribution. Cash Floor card.",
  },
  {
    sectionNumber: "§9 (continued)",
    title: "Cash Mirror — verdict + floor",
    plannedLength: "1 page",
    purpose:
      "4-line verdict on the waterfall + Cash Floor (runway months, monthly burn, floor status).",
  },
  {
    sectionNumber: "§10",
    title: "The Hidden Force Reveal",
    plannedLength: "1 page, ~280 words",
    purpose:
      "Name the invisible constraint — usually Owner Energy, sometimes vertical-specific. % dependence rendered large.",
  },
  {
    sectionNumber: "§11",
    title: "The Three Decisions This Report Defends",
    plannedLength: "1 page, ~340 words",
    purpose:
      "Hire / Price / Cut-or-double-down. Each tied to specific report sections + a recommended call.",
  },
  {
    sectionNumber: "§12",
    title: "The Bootcamp Map — What You'd Work On",
    plannedLength: "1.5 pages, ~430 words",
    purpose:
      "Day 1 / 2 / 3 — which gaps each day fixes + the playbook deliverable + estimated impact in their numbers.",
  },
  {
    sectionNumber: "§13",
    title: "The 90-Day Reread Bookmark",
    plannedLength: "0.5 page, ~150 words",
    purpose:
      "Dated commitment. 5-row table of numbers that should have moved when you reopen this page in 90 days.",
  },
  {
    sectionNumber: "§14",
    title: "Two Ways To Act From Here",
    plannedLength: "0.5 page, ~150 words",
    purpose:
      "Bootcamp / ₹5K 1-2-1 / Membership — archetype-tailored sentence + 3-column comparator + WhatsApp deeplinks.",
  },
  {
    sectionNumber: "§15",
    title: "What This Report Did NOT Cover",
    plannedLength: "0.5 page, ~150 words",
    purpose:
      "The honest gap — 3-4 things this form-driven report can't see that the ₹5K 1-2-1 catches.",
  },
  {
    sectionNumber: "Appendix A",
    title: "Your Full Answer Record",
    plannedLength: "1 page, ~280 words",
    purpose:
      "Q-by-Q table — Q# / Question / Your answer / Score contributed. The audit trail.",
  },
  {
    sectionNumber: "Appendix B",
    title: "Glossary + Methodology Note",
    plannedLength: "1 page, ~280 words",
    purpose:
      "2-column glossary of named terms + 50-word methodology + engine version.",
  },
] as const

export async function renderLongFormReportPdf(
  payload: LongFormReportPayload,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const fonts = loadFonts()
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: PAGE.margin.top,
        bottom: PAGE.margin.bottom,
        left: PAGE.margin.left,
        right: PAGE.margin.right,
      },
      font: fonts.regular,
      bufferPages: true,
      autoFirstPage: true,
    })

    doc.registerFont("Regular", fonts.regular)
    doc.registerFont("Bold", fonts.bold)
    doc.registerFont("Italic", fonts.italic)

    const chunks: Buffer[] = []
    doc.on("data", (c: Buffer) => chunks.push(c))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    // ─── Page 1: Snapshot ─────────────────────────────────────
    renderSnapshot(doc, payload)

    // ─── Page 2: 90-Sec Verdict ──────────────────────────────
    doc.addPage()
    renderVerdict(doc, payload)

    // ─── Page 3: Archetype p1 ────────────────────────────────
    doc.addPage()
    renderArchetypePage1(doc, payload)

    // ─── Page 4: Archetype p2 ────────────────────────────────
    doc.addPage()
    renderArchetypePage2(doc, payload)

    // ─── Page 5: Lie p1 ──────────────────────────────────────
    doc.addPage()
    renderLiePage1(doc, payload)

    // ─── Page 6: Lie p2 ──────────────────────────────────────
    doc.addPage()
    renderLiePage2(doc, payload)

    // ─── Pages 7-20: placeholders ────────────────────────────
    for (const ph of PLACEHOLDERS) {
      doc.addPage()
      renderPlaceholder(doc, ph)
    }

    // ─── Footer on every page (drawn after content) ───────────
    const totalPages = doc.bufferedPageRange().count
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i)
      drawPageFooter(doc, {
        pageNumber: i + 1,
        totalPages,
        watermark: payload.meta.watermark,
      })
    }

    doc.end()
  })
}
