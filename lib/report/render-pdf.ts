// Long-form founder assessment — Phase 1 STUB PDF renderer
// ════════════════════════════════════════════════════════════
// Wraps the existing `generateAuditReportPdf()` (lib/audit/pdf.ts) so
// the stub payload can render through the same code path that produces
// the public /audit PDF — preventing two parallel render pipelines.
//
// Adapts:
//   StubReportPayload  →  GenerateAuditReportPdfInput
//
// Phase 1 watermark: a "PHASE 1 STUB — DO NOT DISTRIBUTE" banner is
// passed via the existing `overlayContent` prop so the report cannot
// be accidentally mistaken for a real Phase 3 output. We do NOT
// modify lib/audit/pdf.ts.
//
// Server-side only — pdfkit is a Node-runtime library.

import type { StubReportPayload } from "@/types/assessment"
import type { IdentityBlock, ForceKey } from "@/lib/audit/types"
import { FORCE_KEYS } from "@/lib/audit/types"
import { PLAYBOOKS } from "@/lib/audit/playbook"
import { generateAuditReportPdf } from "@/lib/audit/pdf"
import type { AuditVerdict } from "@/lib/audit/verdict"
import type { ForceScores, Signals } from "@/lib/audit/scoring"
import { pickStubFocusForce, STUB_FORCE_LABELS } from "./stub-generator"

const STUB_WATERMARK = "PHASE 1 STUB — DO NOT DISTRIBUTE"

/**
 * Build a synthetic AuditVerdict from a StubReportPayload so we can
 * feed it into generateAuditReportPdf without modifying that module.
 *
 * - `scores` maps each ForceKey to a {score, n, untracked} object so
 *   the existing breakdown renderer is happy.
 * - `focus_force` is computed from the stub scores (lowest wins).
 * - `focus_reason` is prefixed with the stub watermark + archetype +
 *   lie name so the verdict block visibly carries the Phase 1 banner.
 * - `signals` are intentionally empty — the stub doesn't synthesise
 *   evidence; Phase 3 will.
 * - `named_move` is the full Playbook for the focus force (NOT the
 *   stub's stripped-down NamedMove). This keeps the PDF rendering
 *   the same diagnosis / moves / variants the public audit shows.
 * - `context` is left empty — we have no revenue/headcount/age in
 *   the stub payload.
 */
function buildSyntheticVerdict(payload: StubReportPayload): AuditVerdict {
  const focusForceCandidate = pickStubFocusForce(
    coerceForceScores(payload.scores),
  )

  const scores = {} as ForceScores
  for (const force of FORCE_KEYS) {
    const raw = payload.scores[force]
    const score =
      typeof raw === "number" && Number.isFinite(raw) ? raw : 0
    scores[force] = { score, n: 1, untracked: 0 }
  }

  const namedMove = PLAYBOOKS[focusForceCandidate]
  const archetypeLine = `Archetype: ${payload.archetype.name}.`
  const lieLine = `Operating lie: ${payload.lie.name}.`
  const contradiction = payload.lie.contradiction
    ? ` ${payload.lie.contradiction}`
    : ""
  const focus_reason =
    `[${STUB_WATERMARK}] ${payload.stub_note} ` +
    `${archetypeLine} ${lieLine}${contradiction}`

  const signals: Signals = {
    strengths: [],
    risks: [],
    blind_spots: [],
  }

  return {
    scores,
    focus_force: focusForceCandidate,
    focus_force_label: STUB_FORCE_LABELS[focusForceCandidate],
    focus_reason,
    named_move: namedMove,
    signals,
    context: {
      revenue_lakhs: null,
      headcount: null,
      founder_age: null,
      stage_tag: null,
    },
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function coerceForceScores(
  raw: Record<string, number>,
): Record<ForceKey, number> {
  const out = {} as Record<ForceKey, number>
  for (const force of FORCE_KEYS) {
    const v = raw[force]
    out[force] = typeof v === "number" && Number.isFinite(v) ? v : 0
  }
  return out
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Render a Phase 1 stub payload to a PDF Buffer.
 *
 * Returns a Buffer (not a Stream) so it can be passed straight to
 * email attachments, Supabase storage uploads, or HTTP responses.
 *
 * The "PHASE 1 STUB — DO NOT DISTRIBUTE" banner is rendered:
 *   (a) prepended to the verdict's focus_reason (visible in the
 *       main "The verdict" section), and
 *   (b) as the `overlayContent` callout card (visible as a
 *       red-bordered "For your <vertical>" callout near the top).
 */
export async function renderStubReportPdf(
  payload: StubReportPayload,
  identity: IdentityBlock,
): Promise<Buffer> {
  const verdict = buildSyntheticVerdict(payload)

  const overlayContent =
    `${STUB_WATERMARK}. ${payload.stub_note} ` +
    `This document was produced by the Phase 1 stub generator for ` +
    `pipeline testing — it is NOT a real founder report. Do not email, ` +
    `print, or share with the founder. Real Claude-driven generation ` +
    `arrives in Phase 3.`

  const buffer = await generateAuditReportPdf({
    identity,
    verdict,
    verticalLabel: payload.founder.vertical_label,
    generatedAt: new Date(payload.generated_at),
    overlayContent,
    applicableVariants: [],
    answers: {},
  })

  return buffer
}
