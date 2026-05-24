import { CheckCircle2 } from "lucide-react"
import { resolveInviteByToken } from "@/lib/assessment/server/resolveInviteByToken"
import { AssessmentShell } from "@/components/assessment/AssessmentShell"

// ════════════════════════════════════════════════════════════
// /assess/[token]/submitted — post-submit confirmation
// ════════════════════════════════════════════════════════════
// Server component. Resolves the invite via a direct DB call to
// personalise the thank-you. If the invite somehow doesn't resolve
// by the time we get here, we fall back to a generic thank-you —
// the submission already exists, so this page doesn't need to gate.

export const dynamic = "force-dynamic"

export default async function AssessmentSubmittedPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const resolved = await resolveInviteByToken(token)

  const firstName =
    resolved.ok
      ? (resolved.full_name ?? "").trim().split(/\s+/)[0] || "there"
      : "there"
  const email = resolved.ok ? resolved.email : null

  return (
    <AssessmentShell>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Assessment received
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
            Thank you, {firstName}.
          </h1>
          <p className="text-base text-muted-foreground max-w-prose">
            Your Scale Code Diagnostic is being prepared. You&apos;ll receive it
            by email
            {email ? (
              <>
                {" "}
                at{" "}
                <span className="font-medium text-foreground">{email}</span>
              </>
            ) : null}{" "}
            within 24–48 hours.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Each report is reviewed personally by Swastik before it&apos;s sent
            — that&apos;s why it&apos;s not instant. You can close this tab; the
            email will land in your inbox when the report is ready.
          </p>
        </div>
      </div>
    </AssessmentShell>
  )
}
