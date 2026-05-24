import { headers } from "next/headers"
import { CheckCircle2 } from "lucide-react"
import type { ResolveInviteResponse } from "@/types/assessment"
import { AssessmentShell } from "@/components/assessment/AssessmentShell"

// ════════════════════════════════════════════════════════════
// /assess/[token]/submitted — post-submit confirmation
// ════════════════════════════════════════════════════════════
// Server component. Resolves the invite to pull the founder's
// first name + email so the thank-you reads personally. If the
// invite is somehow invalid by the time we get here, we fall
// back to a generic thank-you (the submission already exists,
// no need to gate this page hard).

export const dynamic = "force-dynamic"

async function resolveInvite(
  token: string
): Promise<ResolveInviteResponse | null> {
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
    if (!res.ok) return null
    return (await res.json()) as ResolveInviteResponse
  } catch {
    return null
  }
}

export default async function AssessmentSubmittedPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const resolved = await resolveInvite(token)

  const firstName =
    resolved && resolved.ok
      ? (resolved.full_name ?? "").trim().split(/\s+/)[0] || "there"
      : "there"
  const email = resolved && resolved.ok ? resolved.email : null

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
