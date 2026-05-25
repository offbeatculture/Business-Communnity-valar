// Resolve a submission's raw answers JSON into human-readable form:
//   { q19_business_naming: {
//       question_text: "...",
//       force: "identity",
//       value: "job_title",
//       label: "My job title (e.g. 'I'm a CA / coach / dentist / fabricator')",
//       score: 1
//   } }
//
// Reads /tmp/pulled-submission.json (written by pull-submission.mjs).
// Writes /tmp/resolved-answers.json.

import fs from "fs"
import { ASSESSMENT_QUESTIONS } from "../lib/assessment/questions"
import { AUDIT_QUESTIONS } from "../lib/audit/questions"
import type { AuditQuestion } from "../lib/audit/types"

const allQs: AuditQuestion[] = [...ASSESSMENT_QUESTIONS]
// Dedup by id — audit qs are re-exported into ASSESSMENT_QUESTIONS
const seen = new Set(allQs.map((q) => q.id))
for (const q of AUDIT_QUESTIONS) {
  if (!seen.has(q.id)) {
    allQs.push(q)
    seen.add(q.id)
  }
}

const byId = new Map(allQs.map((q) => [q.id, q]))

const pulled = JSON.parse(fs.readFileSync("/tmp/pulled-submission.json", "utf8"))
const answers: Record<string, unknown> = pulled.submission.answers ?? {}

const resolved: Record<string, unknown> = {}
const unmapped: string[] = []

for (const [qid, raw] of Object.entries(answers)) {
  if (qid === "__identity") {
    resolved[qid] = { type: "identity_block", value: raw }
    continue
  }
  const q = byId.get(qid)
  if (!q) {
    unmapped.push(qid)
    resolved[qid] = { type: "unknown_question", value: raw }
    continue
  }
  // raw is typically { value: "...", confidence?: "low|medium|high", note?: "..." }
  // or for number/text: { value: 12, ... }
  const v = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>).value : raw
  const conf = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>).confidence : undefined
  const note = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>).note : undefined

  let label: string | null = null
  let score: number | null = null
  if (
    (q.input_type === "choice" || q.input_type === "band") &&
    typeof v === "string"
  ) {
    const opt = q.options.find((o) => o.value === v)
    label = opt?.label ?? null
    score = opt?.score ?? null
  } else if (q.input_type === "number") {
    label = `${v}${q.unit ?? ""}`
  }

  resolved[qid] = {
    force: q.force,
    section: q.force, // alias
    question_text: q.question_text,
    helper: q.helper ?? null,
    value: v,
    label,
    score,
    confidence: conf ?? null,
    note: note ?? null,
  }
}

const out = {
  identity: pulled.submission,
  resolved,
  unmapped_count: unmapped.length,
  unmapped_qids: unmapped,
}

fs.writeFileSync("/tmp/resolved-answers.json", JSON.stringify(out, null, 2))
console.log(`Resolved ${Object.keys(resolved).length} answers`)
console.log(`Unmapped: ${unmapped.length}`)
if (unmapped.length > 0) {
  console.log("  ", unmapped.slice(0, 5).join(", "))
}
console.log("Wrote /tmp/resolved-answers.json")
