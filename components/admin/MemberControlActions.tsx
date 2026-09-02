"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CalendarPlus, Loader2, Mail, ShieldOff } from "lucide-react"

type Props = {
  profileId: string
  memberName: string
  hasSubscription: boolean
}

type Body =
  | { action: "extend_subscription"; days?: number; until?: string; note?: string }
  | { action: "revoke_access"; note?: string }
  | { action: "resend_login"; note?: string }

export function MemberControlActions({
  profileId,
  memberName,
  hasSubscription,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [panel, setPanel] = useState<"extend" | "revoke" | "resend" | null>(null)
  const [days, setDays] = useState("30")
  const [note, setNote] = useState("")

  async function run(body: Body, key: string) {
    setBusy(key)
    try {
      const res = await fetch(`/api/admin/members/${profileId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const isJson = res.headers.get("content-type")?.includes("application/json")
      if (!isJson) {
        toast.error("Your session has expired. Please sign in again.")
        router.push("/login")
        return
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Action failed")

      toast.success(data.message ?? "Done")
      setPanel(null)
      setNote("")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={panel === "extend" ? "default" : "outline"}
          size="sm"
          onClick={() => setPanel(panel === "extend" ? null : "extend")}
        >
          <CalendarPlus className="mr-1 size-4" />
          Extend access
        </Button>

        <Button
          variant={panel === "resend" ? "default" : "outline"}
          size="sm"
          onClick={() => setPanel(panel === "resend" ? null : "resend")}
        >
          <Mail className="mr-1 size-4" />
          Resend login
        </Button>

        {hasSubscription && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPanel(panel === "revoke" ? null : "revoke")}
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <ShieldOff className="mr-1 size-4" />
            Revoke access
          </Button>
        )}
      </div>

      {panel && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          {panel === "extend" && (
            <>
              <p className="mb-2 text-sm font-medium">
                Extend {memberName}&apos;s access
              </p>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {[7, 30, 90, 365].map((d) => (
                  <Button
                    key={d}
                    variant={days === String(d) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDays(String(d))}
                  >
                    {d} days
                  </Button>
                ))}
                <input
                  value={days}
                  onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  aria-label="Days to extend"
                />
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Counted from today, or from the current expiry if it is still
                in the future.
              </p>
            </>
          )}

          {panel === "revoke" && (
            <>
              <p className="mb-1 text-sm font-medium text-destructive">
                Revoke {memberName}&apos;s access
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                Ends the subscription immediately. They lose access to
                everything behind the paywall on their next page load.
              </p>
            </>
          )}

          {panel === "resend" && (
            <>
              <p className="mb-1 text-sm font-medium">Send a fresh login link</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Emails {memberName} a one-time sign-in link. Useful when
                someone cannot get into their account.
              </p>
            </>
          )}

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why? (optional, saved to the audit trail)"
            maxLength={500}
            className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPanel(null)}>
              Cancel
            </Button>

            <Button
              size="sm"
              disabled={busy !== null || (panel === "extend" && !days)}
              variant={panel === "revoke" ? "destructive" : "default"}
              onClick={() => {
                const trimmed = note.trim() || undefined
                if (panel === "extend") {
                  run(
                    { action: "extend_subscription", days: Number(days), note: trimmed },
                    "extend",
                  )
                } else if (panel === "revoke") {
                  run({ action: "revoke_access", note: trimmed }, "revoke")
                } else {
                  run({ action: "resend_login", note: trimmed }, "resend")
                }
              }}
            >
              {busy && <Loader2 className="mr-1 size-4 animate-spin" />}
              {panel === "extend"
                ? `Extend ${days || 0} days`
                : panel === "revoke"
                  ? "Revoke access"
                  : "Send link"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
