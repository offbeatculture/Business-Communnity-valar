"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Loader2, RefreshCw, Sparkles, UserPlus } from "lucide-react"
import { SINGLE_PLAN } from "@/lib/plans"
import { karmaRecodeExpiry, karmaRecodeStart } from "@/lib/karma-recode-dates"

const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })

export function CreateMemberForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [accessDays, setAccessDays] = useState("30")
  const [sendLogin, setSendLogin] = useState(true)
  const [note, setNote] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [lockedPrice, setLockedPrice] = useState(
    String(SINGLE_PLAN.amountRupees),
  )
  const [karmaRecode, setKarmaRecode] = useState(false)
  const [krPurchasedOn, setKrPurchasedOn] = useState("")
  const [phone, setPhone] = useState("")
  const [busy, setBusy] = useState(false)

  // Blank is valid: it means "no password, send them a magic link instead".
  // Anything typed has to clear Supabase's minimum.
  const passwordTooShort = password.length > 0 && password.length < 8
  const priceInvalid =
    lockedPrice.trim() !== "" && !Number.isInteger(Number(lockedPrice))

  const canSubmit =
    email.trim().length > 3 &&
    fullName.trim().length > 0 &&
    !passwordTooShort &&
    !priceInvalid

  function generatePassword() {
    // Browser crypto, so the value never comes from a predictable source.
    // Ambiguous characters are left out: these get read aloud and retyped.
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    const bytes = new Uint32Array(14)
    crypto.getRandomValues(bytes)

    setPassword(
      Array.from(bytes, (n) => alphabet[n % alphabet.length]).join(""),
    )
    setShowPassword(true)
  }

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
          password: password.length > 0 ? password : undefined,
          locked_price_rupees:
            lockedPrice.trim() === "" ? undefined : Number(lockedPrice),
          karma_recode: karmaRecode,
          karma_recode_purchased_on: karmaRecode && krPurchasedOn ? krPurchasedOn : undefined,
          phone: phone.trim() || undefined,
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

      <Field label="Password (optional)">
        <div className="flex gap-2">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to send a login link instead"
            autoComplete="new-password"
            maxLength={72}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPassword((v) => !v)}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generatePassword}
          >
            <RefreshCw className="mr-1 size-3.5" />
            Generate
          </Button>
        </div>

        {passwordTooShort ? (
          <p className="mt-1.5 text-xs text-destructive">
            Use at least 8 characters.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Set one and they can sign in straight away. Leave it blank and they
            choose their own through the login link.
          </p>
        )}
      </Field>

      <div
        className={`rounded-lg border p-3 ${
          karmaRecode ? "border-primary/40 bg-primary/5" : "border-border"
        }`}
      >
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={karmaRecode}
            onChange={(e) => setKarmaRecode(e.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="size-4 text-primary" />
              Karma Recode member
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Lifinity plus the Karma Recode tab, for one year from purchase.
              Purchases before 1 June 2026 count from 1 June 2026.
            </span>
          </span>
        </label>

        {karmaRecode && (
          <div className="mt-3 space-y-3 pl-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">
                  Date they bought Karma Recode
                </label>
                <input
                  type="date"
                  value={krPurchasedOn}
                  onChange={(e) => setKrPurchasedOn(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">
                  Phone (optional)
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <p className="text-xs">
              Access counts from{" "}
              <strong>{fmtDate(karmaRecodeStart(krPurchasedOn || null))}</strong>{" "}
              and ends{" "}
              <strong>{fmtDate(karmaRecodeExpiry(krPurchasedOn || null))}</strong>.
              {!krPurchasedOn && " Add the purchase date if it was after 1 June 2026."}
            </p>
          </div>
        )}
      </div>

      {!karmaRecode && (
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
          subscription — for someone who will pay separately. If this email
          is already on the Karma Recode list, they get their Karma Recode year
          instead.
        </p>
      </Field>
      )}

      {/* Only meaningful alongside a subscription. With no access there is no
          row to record the rate against. */}
      {!karmaRecode && accessDays !== "0" && (
        <Field label="Locked price">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">₹</span>

            <input
              type="number"
              min={0}
              step={1}
              value={lockedPrice}
              onChange={(e) => setLockedPrice(e.target.value)}
              className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />

            <span className="text-sm text-muted-foreground">/ month</span>
          </div>

          {priceInvalid ? (
            <p className="mt-1.5 text-xs text-destructive">
              Enter a whole number of rupees.
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">
              The rate this member stays on, even if list pricing changes later.
              Current list price is ₹{SINGLE_PLAN.amountRupees}. Use 0 for a
              complimentary account.
            </p>
          )}
        </Field>
      )}

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
