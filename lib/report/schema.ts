// Long-form founder assessment — Phase 1 stub payload schema
// ════════════════════════════════════════════════════════════
// Runtime validation for `StubReportPayload` (see types/assessment.ts).
// Phase 1 only — Phase 3 will introduce a richer `ReportPayloadSchema`
// here alongside the stub. Keep this file scoped to the stub for now.

import { z } from "zod/v4"

export const StubReportPayloadSchema = z.object({
  version: z.literal("1-stub"),
  founder: z.object({
    full_name: z.string(),
    business_name: z.string(),
    vertical: z.string(),
    vertical_label: z.string(),
  }),
  archetype: z.object({
    name: z.string(),
    one_liner: z.string(),
    secondary: z.string(),
  }),
  lie: z.object({
    name: z.string(),
    why_we_think_you_hold_this: z.array(z.string()).min(1).max(5),
    contradiction: z.string(),
  }),
  scores: z.record(z.string(), z.number().min(0).max(5)),
  named_move: z.object({
    title: z.string(),
    promise: z.string(),
    target_metric: z.string(),
  }),
  generated_at: z.string(), // ISO
  stub_note: z.string(),
})

export type StubReportPayloadValidated = z.infer<typeof StubReportPayloadSchema>
