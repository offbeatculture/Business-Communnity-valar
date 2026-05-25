import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { resolveInviteByToken } from "@/lib/assessment/server/resolveInviteByToken"
import { consumeInviteByToken } from "@/lib/assessment/server/consumeInviteByToken"
import { getSubmissionForResume } from "@/lib/assessment/server/getSubmissionForResume"
import { AssessmentShell } from "@/components/assessment/AssessmentShell"
import { AssessmentFormWrapper } from "@/components/assessment/AssessmentFormWrapper"
import { Button } from "@/components/ui/button"

// ════════════════════════════════════════════════════════════
// /assess/[token]/form — the actual assessment form
// ════════════════════════════════════════════════════════════
// Server component. Resolves the invite via a direct DB call,
// consumes it to get a submission_id if needed, then hands off to
// a client wrapper. No HTTP round-trip back to /api/invites/* —
// that pattern is fragile on Vercel and was the root cause of the
// "Invite unavailable" misdiagnosis (commit 21a2e80).
//
// Error handling: instead of redirecting back to the briefing page
// (which would also fail and hide the real reason), we render an
// inline error card with the actual message. The founder can choose
// to head back to the briefing themselves.

export const dynamic = "force-dynamic"

export default async function AssessmentFormPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const resolved = await resolveInviteByToken(token)
  if (!resolved.ok) {
    return (
      <AssessmentShell>
        <FormErrorCard
          title="Invite unavailable"
          message={resolved.error || "This invite is no longer valid."}
          token={token}
        />
      </AssessmentShell>
    )
  }

  if (resolved.status === "expired") {
    return (
      <AssessmentShell>
        <FormErrorCard
          title="Invite expired"
          message="This invite has expired."
          token={token}
        />
      </AssessmentShell>
    )
  }

  if (resolved.status === "revoked") {
    return (
      <AssessmentShell>
        <FormErrorCard
          title="Invite revoked"
          message="This invite has been revoked."
          token={token}
        />
      </AssessmentShell>
    )
  }

  if (resolved.status === "submitted") {
    return (
      <AssessmentShell>
        <FormErrorCard
          title="Already submitted"
          message="You've already submitted this assessment. We'll email your report within 24–48 hours."
          token={token}
          backLabel="View confirmation"
          backHref={`/assess/${token}/submitted`}
        />
      </AssessmentShell>
    )
  }

  // If we already have a submission_id from a prior consume, reuse it.
  // Otherwise consume now to materialise the submission row.
  let submissionId = resolved.submission_id
  if (!submissionId) {
    const consumed = await consumeInviteByToken(token)
    if (!consumed.ok) {
      return (
        <AssessmentShell>
          <FormErrorCard
            title="Couldn't start the assessment"
            message={consumed.error || "Something went wrong. Please try again."}
            token={token}
          />
        </AssessmentShell>
      )
    }
    submissionId = consumed.submission_id
  }

  // Rehydrate any auto-saved progress so refresh / tab-reopen doesn't
  // wipe the form. Pulls the answers blob, peels __identity off, and
  // returns both pieces so the wrapper can seed its state.
  const resumeState = await getSubmissionForResume(submissionId, {
    full_name: resolved.full_name,
    email: resolved.email,
  })

  return (
    <AssessmentShell>
      <AssessmentFormWrapper
        token={token}
        submissionId={submissionId}
        initialIdentity={resumeState.initialIdentity}
        initialAnswers={resumeState.initialAnswers}
      />
    </AssessmentShell>
  )
}

function FormErrorCard({
  title,
  message,
  token,
  backLabel = "Back to briefing",
  backHref,
}: {
  title: string
  message: string
  token: string
  backLabel?: string
  backHref?: string
}) {
  const href = backHref ?? `/assess/${token}`
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm font-semibold text-destructive">{title}</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {message}
        </h1>
        <p className="text-sm text-muted-foreground max-w-prose">
          If you believe this is a mistake, please reply to the email that
          invited you and we&apos;ll sort it out.
        </p>
      </div>
      <Link href={href}>
        <Button variant="outline" size="lg">
          {backLabel}
        </Button>
      </Link>
    </div>
  )
}
