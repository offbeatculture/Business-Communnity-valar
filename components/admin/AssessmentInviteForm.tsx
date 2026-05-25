"use client"

// ============================================================
// AssessmentInviteForm — admin issues a new long-form assessment invite.
//
// Posts to POST /api/admin/invites and surfaces the returned magic link
// in a copyable input. The link is shown ONCE and only once: after the
// admin closes the success card, there is no way to retrieve it again
// (the server only stores the SHA-256 hash). The UI yells about this
// loudly so admins don't accidentally dismiss the panel before copying.
// ============================================================

import { useRef, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Copy, Check, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VERTICALS } from "@/lib/audit/types"
import type { IssueInviteResponse } from "@/types/assessment"

const PHONE_RE = /^[6-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Props = {
  onIssued: () => void
}

export function AssessmentInviteForm({ onIssued }: Props) {
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [vertical, setVertical] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [issued, setIssued] = useState<IssueInviteResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const linkRef = useRef<HTMLInputElement>(null)

  function validate(): string | null {
    if (!EMAIL_RE.test(email.trim())) return "Enter a valid email"
    if (fullName.trim().length < 2) return "Full name is required (≥ 2 chars)"
    if (phone.trim() && !PHONE_RE.test(phone.trim()))
      return "Phone must be a 10-digit Indian mobile (starts 6–9)"
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim() || undefined,
          vertical: vertical || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to issue invite")
      }

      setIssued(data as IssueInviteResponse)
      setCopied(false)
      toast.success("Invite issued. Copy the link before closing this card.")
      onIssued()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to issue invite")
    } finally {
      setSubmitting(false)
    }
  }

  async function copyLink() {
    if (!issued) return
    try {
      await navigator.clipboard.writeText(issued.link)
      setCopied(true)
      toast.success("Link copied to clipboard")
    } catch {
      // Fallback for permission-blocked clipboards.
      linkRef.current?.select()
      document.execCommand("copy")
      setCopied(true)
      toast.success("Link copied to clipboard")
    }
  }

  function dismissIssued() {
    setIssued(null)
    setCopied(false)
    setEmail("")
    setFullName("")
    setPhone("")
    setVertical("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="size-5 text-primary" />
          Issue Assessment Invite
        </CardTitle>
      </CardHeader>
      <CardContent>
        {issued ? (
          // SUCCESS CARD — the only time this link will EVER be visible.
          // Visually screams; closing requires explicit action.
          <div className="rounded-lg border-2 border-amber-500 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Copy this link now — it will NOT be shown again.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  We only store a hash of the token. If you close this card
                  without copying, you&apos;ll have to revoke this invite and
                  issue a new one.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                ref={linkRef}
                readOnly
                value={issued.link}
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                onClick={copyLink}
                variant={copied ? "outline" : "default"}
              >
                {copied ? (
                  <>
                    <Check className="size-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-4 mr-1" />
                    Copy link
                  </>
                )}
              </Button>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={dismissIssued}
                disabled={!copied}
                title={
                  copied
                    ? "Reset form"
                    : "Copy the link first — it will not be shown again."
                }
              >
                {copied ? "Done — issue another" : "Copy the link first"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Email <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@example.com"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Full name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  minLength={2}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Phone (optional)
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98xxxxxxxx"
                  inputMode="numeric"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  10 digits, starting 6–9 (Indian mobile).
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Vertical (optional)
                </label>
                <Select
                  value={vertical}
                  onValueChange={(v) => setVertical(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select vertical…" />
                  </SelectTrigger>
                  <SelectContent>
                    {VERTICALS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
                Issue Invite
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
