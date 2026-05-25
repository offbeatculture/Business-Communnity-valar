"use client"

// ============================================================
// AssessmentInvitesPanel — admin's invite hub. Toggle between
// single-invite issue and CSV bulk upload, then the live invites
// list below. The list listens to a refreshToken so any successful
// action refreshes it automatically.
// ============================================================

import { useState } from "react"
import { Send, Upload } from "lucide-react"
import { AssessmentInviteForm } from "@/components/admin/AssessmentInviteForm"
import { AssessmentBulkInviteForm } from "@/components/admin/AssessmentBulkInviteForm"
import { AssessmentInvitesList } from "@/components/admin/AssessmentInvitesList"
import { Button } from "@/components/ui/button"

type Mode = "single" | "bulk"

export function AssessmentInvitesPanel() {
  const [refreshToken, setRefreshToken] = useState(0)
  const [mode, setMode] = useState<Mode>("single")
  const bumpRefresh = () => setRefreshToken((n) => n + 1)

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        <Button
          type="button"
          variant={mode === "single" ? "default" : "ghost"}
          size="sm"
          onClick={() => setMode("single")}
          className="gap-2"
        >
          <Send className="size-4" />
          Single invite
        </Button>
        <Button
          type="button"
          variant={mode === "bulk" ? "default" : "ghost"}
          size="sm"
          onClick={() => setMode("bulk")}
          className="gap-2"
        >
          <Upload className="size-4" />
          Bulk upload
        </Button>
      </div>

      {mode === "single" ? (
        <AssessmentInviteForm onIssued={bumpRefresh} />
      ) : (
        <AssessmentBulkInviteForm onIssued={bumpRefresh} />
      )}

      <AssessmentInvitesList refreshToken={refreshToken} onChanged={bumpRefresh} />
    </div>
  )
}
