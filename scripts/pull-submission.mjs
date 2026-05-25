// One-shot: pull all submissions for a given email + any draft payload.
// Output written to /tmp/pulled-submission.json so Claude (the report
// writer) can read the actual founder answers.
//
// Usage: node scripts/pull-submission.mjs <email>

import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

// Read .env.local manually (no dotenv dep needed).
const envPath = path.join(process.cwd(), ".env.local")
const envText = fs.readFileSync(envPath, "utf8")
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const eq = l.indexOf("=")
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()]
    }),
)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const email = process.argv[2]
if (!email) {
  console.error("usage: node scripts/pull-submission.mjs <email>")
  process.exit(1)
}

const { data: submissions, error } = await supabase
  .from("audit_submissions")
  .select("*")
  .eq("email", email)
  .order("submitted_at", { ascending: false })

if (error) {
  console.error("submissions query failed:", error)
  process.exit(1)
}

console.log(
  `Found ${submissions?.length ?? 0} submissions for ${email}\n`,
)

if (!submissions || submissions.length === 0) {
  // Try invite table — maybe the founder was invited but never submitted
  const { data: invites } = await supabase
    .from("assessment_invites")
    .select("*")
    .eq("email", email)
  console.log("Invites found:", JSON.stringify(invites, null, 2))
  process.exit(0)
}

for (const sub of submissions) {
  console.log("─".repeat(60))
  console.log(`Submission id: ${sub.id}`)
  console.log(`  kind: ${sub.submission_kind}`)
  console.log(`  submitted_at: ${sub.submitted_at}`)
  console.log(`  full_name: ${sub.full_name}`)
  console.log(`  business_name: ${sub.business_name}`)
  console.log(`  vertical: ${sub.vertical}`)
  console.log(`  city: ${sub.city}`)
  console.log(`  report_status: ${sub.report_status}`)
  console.log(
    `  answers keys (${Object.keys(sub.answers ?? {}).length}): ${Object.keys(sub.answers ?? {}).slice(0, 10).join(", ")}...`,
  )
}

// Pull all drafts for these submission ids
const ids = submissions.map((s) => s.id)
const { data: drafts } = await supabase
  .from("report_drafts")
  .select("*")
  .in("submission_id", ids)
  .order("created_at", { ascending: false })

console.log(`\nFound ${drafts?.length ?? 0} drafts`)
for (const d of drafts ?? []) {
  console.log(`  draft ${d.id} for submission ${d.submission_id} — status ${d.status}`)
}

// Pick the COMPLETED submission with the most answers (a fully filled
// 96-question one ranks above an abandoned 20-answer draft).
const ranked = [...submissions].sort((a, b) => {
  const aDone = a.submitted_at ? 1 : 0
  const bDone = b.submitted_at ? 1 : 0
  if (aDone !== bDone) return bDone - aDone
  return (
    Object.keys(b.answers ?? {}).length -
    Object.keys(a.answers ?? {}).length
  )
})
const target = ranked[0]
const targetDraft = drafts?.find((d) => d.submission_id === target.id) ?? null

const output = {
  submission: target,
  draft: targetDraft,
  all_submissions_summary: submissions.map((s) => ({
    id: s.id,
    kind: s.submission_kind,
    submitted_at: s.submitted_at,
    answer_count: Object.keys(s.answers ?? {}).length,
  })),
}

fs.writeFileSync(
  "/tmp/pulled-submission.json",
  JSON.stringify(output, null, 2),
)
console.log("\nWrote /tmp/pulled-submission.json")
console.log(
  `Target submission: ${target.id} (${target.submission_kind}, ${Object.keys(target.answers ?? {}).length} answers)`,
)
