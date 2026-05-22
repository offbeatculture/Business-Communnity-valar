import type { AuditAnswers, IdentityBlock } from "@/lib/audit/types"
import type { AuditVerdict } from "@/lib/audit/verdict"

/**
 * Canonical payload for generating an audit report PDF + email.
 * Built server-side from the AuditForm submission: identity + answers
 * arrive from the client, verdict is recomputed on the server via
 * computeVerdict(answers), and verticalLabel is resolved from VERTICALS.
 */
export type AuditReportData = {
  identity: IdentityBlock
  answers: AuditAnswers
  verdict: AuditVerdict
  verticalLabel: string
  generatedAt: Date
}
