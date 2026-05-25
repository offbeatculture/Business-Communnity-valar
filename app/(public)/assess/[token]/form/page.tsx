import { redirect } from "next/navigation"
import { headers } from "next/headers"
import type {
  ConsumeInviteResponse,
  ResolveInviteResponse,
} from "@/types/assessment"
import { AssessmentShell } from "@/components/assessment/AssessmentShell"
import { AssessmentFormWrapper } from "@/components/assessment/AssessmentFormWrapper"

// ════════════════════════════════════════════════════════════
// /assess/[token]/form — the actual assessment form
// ════════════════════════════════════════════════════════════
// Server component. Resolves the invite defensively (status could
// have changed since the founder saw the landing page), consumes
// it to get a submission_id if needed, then hands off to a client
// wrapper that renders the form pre-populated with invite identity.

export const dynamic = "force-dynamic"

function buildBase(h: Headers): string {
  const host = h.get("host")
  const protocol =
    h.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https")
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? (host ? `${protocol}://${host}` : "")
  )
}

async function resolveInvite(
  base: string,
  token: string
): Promise<ResolveInviteResponse> {
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

async function consumeInvite(
  base: string,
  token: string
): Promise<ConsumeInviteResponse> {
  try {
    const res = await fetch(
      `${base}/api/invites/${encodeURIComponent(token)}/consume`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    )
    if (!res.ok) {
      return { ok: false, error: `Consume failed (${res.status})` }
    }
    return (await res.json()) as ConsumeInviteResponse
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    }
  }
}

export default async function AssessmentFormPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const h = await headers()
  const base = buildBase(h)

  const resolved = await resolveInvite(base, token)
  if (!resolved.ok) {
    redirect(`/assess/${encodeURIComponent(token)}`)
  }

  // Defensive: if status is terminal or unexpected, bounce back to
  // the landing page so the user sees the right messaging.
  if (
    resolved.status === "submitted" ||
    resolved.status === "expired" ||
    resolved.status === "revoked"
  ) {
    redirect(`/assess/${encodeURIComponent(token)}`)
  }

  // If we already have a submission_id from a prior consume, reuse it.
  // Otherwise consume now to materialise the submission row.
  let submissionId = resolved.submission_id
  if (!submissionId) {
    const consumed = await consumeInvite(base, token)
    if (!consumed.ok) {
      redirect(`/assess/${encodeURIComponent(token)}`)
    }
    submissionId = consumed.submission_id
  }

  return (
    <AssessmentShell>
      <AssessmentFormWrapper
        token={token}
        submissionId={submissionId}
        initialIdentity={{
          full_name: resolved.full_name,
          email: resolved.email,
        }}
      />
    </AssessmentShell>
  )
}
