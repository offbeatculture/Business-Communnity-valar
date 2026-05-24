"use client"

// ============================================================
// AssessmentInvitesPanel — thin client wrapper composing the
// invite form and the invites list. Owns a `refreshToken` so the
// list reloads after a successful issue.
// ============================================================

import { useState } from "react"
import { AssessmentInviteForm } from "@/components/admin/AssessmentInviteForm"
import { AssessmentInvitesList } from "@/components/admin/AssessmentInvitesList"

export function AssessmentInvitesPanel() {
  const [refreshToken, setRefreshToken] = useState(0)

  return (
    <div className="space-y-6">
      <AssessmentInviteForm onIssued={() => setRefreshToken((n) => n + 1)} />
      <AssessmentInvitesList refreshToken={refreshToken} />
    </div>
  )
}
