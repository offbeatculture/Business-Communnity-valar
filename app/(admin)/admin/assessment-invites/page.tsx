// ============================================================
// /admin/assessment-invites — issue + list assessment invites.
//
// Server component shell. Admin role is enforced upstream by
// `app/(admin)/admin/layout.tsx`, so we don't duplicate auth here.
// The form and list share state through a small client wrapper so
// that issuing an invite refreshes the table below without a full
// server round trip.
// ============================================================

import { AssessmentInvitesPanel } from "@/components/admin/AssessmentInvitesPanel"

export const metadata = {
  title: "Assessment Invites — Admin",
}

export default function AssessmentInvitesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Assessment Invites</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Issue magic-link invites to founders and review who&apos;s in the
        funnel. Links are shown once — copy carefully.
      </p>

      <AssessmentInvitesPanel />
    </div>
  )
}
