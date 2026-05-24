import Link from "next/link"
import { headers } from "next/headers"
import { Button } from "@/components/ui/button"
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react"
import type { ResolveInviteResponse } from "@/types/assessment"
import { AssessmentShell } from "@/components/assessment/AssessmentShell"

// ════════════════════════════════════════════════════════════
// /assess/[token] — landing + briefing
// ════════════════════════════════════════════════════════════
// Server component. Resolves the invite token via the API once on
// load so the page renders correctly the first time (no client
// fetch / flicker). Branches on the invite status:
//
//   invalid  → "This invite is no longer valid"
//   issued   → briefing + "Start the Assessment"
//   opened   → briefing + "Start the Assessment"
//   in_progress → "Resume where you left off"
//   submitted   → "You've already submitted" + link to /submitted
//   expired/revoked → same as invalid
//
// The invite token IS the auth here — no middleware auth required.

export const dynamic = "force-dynamic"

async function resolveInvite(
  token: string
): Promise<ResolveInviteResponse> {
  const h = await headers()
  const host = h.get("host")
  const protocol =
    h.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https")
  // Prefer the request's own host so preview deployments call their own
  // API routes (not prod's, which may have stale middleware/code).
  const base = host
    ? `${protocol}://${host}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? "")

  try {
    const res = await fetch(
      `${base}/api/invites/${encodeURIComponent(token)}/resolve`,
      { cache: "no-store" }
    )
    if (!res.ok) {
      return { ok: false, error: `Invite lookup failed (${res.status})` }
    }
    return (await res.json()) as ResolveInviteResponse
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    }
  }
}

export default async function AssessmentLandingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const resolved = await resolveInvite(token)

  if (!resolved.ok) {
    return (
      <AssessmentShell>
        <InvalidInviteCard message="This invite is no longer valid." />
      </AssessmentShell>
    )
  }

  const { full_name, status } = resolved

  if (status === "expired" || status === "revoked") {
    return (
      <AssessmentShell>
        <InvalidInviteCard
          message={
            status === "expired"
              ? "This invite has expired."
              : "This invite has been revoked."
          }
        />
      </AssessmentShell>
    )
  }

  if (status === "submitted") {
    return (
      <AssessmentShell>
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Already submitted
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
              You&apos;ve already submitted your assessment.
            </h1>
            <p className="text-base text-muted-foreground max-w-prose">
              Your Scale Code Diagnostic is being prepared. We&apos;ll email it
              to you within 24–48 hours.
            </p>
          </div>
          <Link href={`/assess/${encodeURIComponent(token)}/submitted`}>
            <Button size="lg" className="w-full sm:w-auto">
              View confirmation
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </AssessmentShell>
    )
  }

  const isResume = status === "in_progress"
  const firstName = (full_name ?? "").trim().split(/\s+/)[0] || "there"

  return (
    <AssessmentShell>
      <div className="space-y-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Your Scale Code Diagnostic
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
            Hi {firstName},
          </h1>
          <p className="text-base text-muted-foreground max-w-prose">
            {isResume ? (
              <>
                You started this assessment earlier — pick up where you left off.
                It takes 15–20 minutes end-to-end. Take it in one sitting if you
                can. Before you continue, have these handy:
              </>
            ) : (
              <>
                This assessment takes 15–20 minutes. Take it in one sitting —
                you&apos;ll get more out of it. Before you start, have these
                handy:
              </>
            )}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <p className="text-sm font-medium">Have these ready:</p>
          <ul className="text-sm text-muted-foreground space-y-2.5">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
              <span>Your business&apos;s monthly revenue (rough is fine)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
              <span>Your monthly marketing spend (rough is fine)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
              <span>
                Your monthly cost of delivery / gross margin (best guess)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
              <span>
                The names of your top 3 customers (no need to share — just have
                them in your head)
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">
              This is a one-time invite.
            </span>{" "}
            Once you submit, we generate a 15–20 page personalised report and
            email it to you within 24–48 hours.
          </p>
        </div>

        <Link href={`/assess/${encodeURIComponent(token)}/form`}>
          <Button size="lg" className="w-full sm:w-auto">
            {isResume ? "Resume where you left off" : "Start the Assessment"}
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    </AssessmentShell>
  )
}

function InvalidInviteCard({ message }: { message: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm font-semibold text-destructive">
            Invite unavailable
          </p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {message}
        </h1>
        <p className="text-sm text-muted-foreground max-w-prose">
          If you believe this is a mistake, please reply to the email that
          invited you and we&apos;ll sort it out.
        </p>
      </div>
      <Link
        href="/"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        Back to home
      </Link>
    </div>
  )
}
