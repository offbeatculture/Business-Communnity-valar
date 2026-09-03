"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Loader2, UserPlus } from "lucide-react"

export function CreateMemberForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [accessDays, setAccessDays] = useState("30")
  const [sendLogin, setSendLogin] = useState(true)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const canSubmit = email.trim().length > 3 && fullName.trim().length > 0

  async function submit() {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/members/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          access_days: Number(accessDays) || 0,
          send_login: sendLogin,
          note: note.trim() || undefined,
        }),
      })

      const isJson = res.headers.get("content-type")?.includes("application/json")
      if (!isJson) {
        toast.error("Your session has expired. Please sign in again.")
        router.push("/login")
        return
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create the member")

      toast.success(data.message)

      if (data.profileId) router.push(`/admin/members/${data.profileId}`)
      else router.push("/admin/members")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the member")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
      <Field label="Email address">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="member@example.com"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Full name">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Their name"
          maxLength={120}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Access">
        <div className="flex flex-wrap items-center gap-2">
          {["30", "90", "365", "0"].map((d) => (
            <Button
              key={d}
              type="button"
              variant={accessDays === d ? "default" : "outline"}
              size="sm"
              onClick={() => setAccessDays(d)}
            >
              {d === "0" ? "No access yet" : `${d} days`}
            </Button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          &ldquo;No access yet&rdquo; creates the account without a
          subscription — for someone who will pay separately.
        </p>
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sendLogin}
          onChange={(e) => setSendLogin(e.target.checked)}
          className="size-4 accent-primary"
        />
        Email them a login link now
      </label>

      <Field label="Note (optional)">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why this account was created — saved to the audit trail"
          maxLength={500}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>

      <Button onClick={submit} disabled={!canSubmit || busy} className="w-full">
        {busy ? (
          <Loader2 className="mr-1 size-4 animate-spin" />
        ) : (
          <UserPlus className="mr-1 size-4" />
        )}
        Create member
      </Button>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}
