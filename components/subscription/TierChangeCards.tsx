"use client"

// ============================================================
// TierChangeCards — Member-facing tier change UI (Phase 5C).
//
// Renders three compact tier cards on the /subscription page and wires
// up the upgrade / downgrade flows against the Phase 5A endpoints:
//
//   POST /api/subscription/upgrade
//   POST /api/subscription/upgrade/verify
//   POST /api/subscription/downgrade
//
// Behaviour driven by /Three-tier-implementation-plan.md decisions D1, D2,
// D5. Pro-rate hint is computed in-browser for display only; the server is
// authoritative when the upgrade order is created.
// ============================================================

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { Check, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  formatINR,
  getTierLabel,
  getTierRank,
  type ProductTier,
  type TierPricingCard,
} from "@/lib/plans"

// Razorpay checkout types intentionally inlined here (rather than reusing
// `openRazorpayCheckout` from lib/razorpay-checkout.ts) because the upgrade
// flow has a bespoke verification endpoint that takes the target tier.
// We deliberately do NOT add a global `Window.Razorpay` declaration — that
// already exists in lib/razorpay-checkout.ts and re-declaring would conflict.
type LocalRazorpayInstance = { open(): void }

type LocalRazorpayResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

type LocalRazorpayOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill?: { email?: string; name?: string }
  notes?: Record<string, string>
  theme?: { color?: string }
  handler: (response: LocalRazorpayResponse) => void
  modal?: { ondismiss?: () => void }
}

type WindowWithRazorpay = Window & {
  Razorpay: new (options: LocalRazorpayOptions) => LocalRazorpayInstance
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window unavailable"))
      return
    }
    const w = window as unknown as { Razorpay?: unknown }
    if (w.Razorpay) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Razorpay"))
    document.body.appendChild(script)
  })
}

// ── Pro-rate hint (display only — server is authoritative) ──
// Mirrors `computeProratePaise` in lib/subscription/tier-change.ts.
function computeProratePaiseDisplay(args: {
  currentLockedPaise: number
  newMonthlyPaise: number
  startsAt: string
  expiresAt: string
  now: Date
}): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const MIN_PAISE = 100
  const startsAt = new Date(args.startsAt).getTime()
  const expiresAt = new Date(args.expiresAt).getTime()
  const now = args.now.getTime()
  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAt - now) / MS_PER_DAY),
  )
  const totalDays = Math.max(
    1,
    Math.ceil((expiresAt - startsAt) / MS_PER_DAY),
  )
  const diff = args.newMonthlyPaise - args.currentLockedPaise
  if (diff <= 0) return MIN_PAISE
  const raw = diff * (daysRemaining / totalDays)
  return Math.max(MIN_PAISE, Math.round(raw))
}

function formatIstDate(iso: string): string {
  // date-fns formats in local time; rendering happens on the user's browser
  // so this aligns with the IST timezone for our India-only audience.
  return format(new Date(iso), "d MMM yyyy")
}

// ── Per-tier marketing blurbs (same source of truth as /plans page) ──
const TIER_BULLETS: Record<ProductTier, string[]> = {
  library: [
    "Community feed (read + post)",
    "Templates, frameworks, walls library",
    "Weekly prompts and newsletter",
    "Workshop replays after 30-day delay",
  ],
  workshop: [
    "Everything in Library",
    "Live monthly Workshop event (hot-seat)",
    "Immediate access to Workshop replays",
    "Priority on diagnostic call slots",
  ],
  ai_lab: [
    "Everything in Workshop",
    "Live monthly AI Lab event",
    "Immediate access to AI Lab replays",
    "Early-bird ticket window for Reset",
  ],
}

// ── Props ──

export type TierChangeCardsProps = {
  tiers: TierPricingCard[]
  currentTier: ProductTier
  currentLockedPaise: number
  startsAt: string
  expiresAt: string
  pendingDowngradeTo: ProductTier | null
  alreadyChangedThisPeriod: boolean
  isLegacy: boolean
}

type DialogState =
  | { kind: "closed" }
  | {
      kind: "upgrade"
      toTier: ProductTier
      toLabel: string
      newMonthlyPaise: number
      proRatePaise: number
    }
  | {
      kind: "downgrade"
      toTier: ProductTier
      toLabel: string
      newMonthlyPaise: number
    }

export function TierChangeCards({
  tiers,
  currentTier,
  currentLockedPaise,
  startsAt,
  expiresAt,
  pendingDowngradeTo,
  alreadyChangedThisPeriod,
  isLegacy,
}: TierChangeCardsProps) {
  const router = useRouter()
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" })
  const [isPending, startTransition] = useTransition()
  const [busyTier, setBusyTier] = useState<ProductTier | null>(null)

  const currentRank = getTierRank(currentTier)
  const now = useMemo(() => new Date(), [])

  // D5 lock + pending-downgrade lock + legacy lock. Buttons are disabled
  // when any of these are true; copy below the cards explains why.
  const allChangesLocked =
    isLegacy || !!pendingDowngradeTo || alreadyChangedThisPeriod

  const lockedReason = isLegacy
    ? "Legacy one-time subscription — tier changes are unavailable via the app. Please contact support."
    : pendingDowngradeTo
      ? "Tier change scheduled — cannot change again until next billing period."
      : alreadyChangedThisPeriod
        ? "Tier change already used this billing period."
        : null

  const handleClick = (target: TierPricingCard) => {
    if (allChangesLocked) return
    if (target.tier === currentTier) return

    const targetRank = getTierRank(target.tier)
    const toLabel = getTierLabel(target.tier)

    if (targetRank > currentRank) {
      const proRatePaise = computeProratePaiseDisplay({
        currentLockedPaise,
        newMonthlyPaise: target.monthlyPaise,
        startsAt,
        expiresAt,
        now,
      })
      setDialog({
        kind: "upgrade",
        toTier: target.tier,
        toLabel,
        newMonthlyPaise: target.monthlyPaise,
        proRatePaise,
      })
    } else {
      setDialog({
        kind: "downgrade",
        toTier: target.tier,
        toLabel,
        newMonthlyPaise: target.monthlyPaise,
      })
    }
  }

  const confirmUpgrade = async () => {
    if (dialog.kind !== "upgrade") return
    const { toTier, toLabel } = dialog
    setBusyTier(toTier)

    try {
      // 1. Ask the server for a Razorpay order for the pro-rated amount.
      const orderRes = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_tier: toTier }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        toast.error(orderData.error ?? "Failed to start upgrade")
        setBusyTier(null)
        setDialog({ kind: "closed" })
        return
      }

      await loadRazorpayScript()
      const key: string = orderData.keyId
      if (!key) {
        toast.error("Razorpay is not configured")
        setBusyTier(null)
        setDialog({ kind: "closed" })
        return
      }

      // Close the dialog before Razorpay opens so the modal does not stack.
      setDialog({ kind: "closed" })

      const options: LocalRazorpayOptions = {
        key,
        amount: orderData.amountPaise,
        currency: "INR",
        name: "Superhuman Entrepreneur",
        description: `Upgrade to ${toLabel}`,
        order_id: orderData.orderId,
        prefill: orderData.prefill ?? undefined,
        notes: orderData.notes ?? undefined,
        theme: { color: "#E53935" },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(
              "/api/subscription/upgrade/verify",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  to_tier: toTier,
                }),
              },
            )
            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) {
              toast.error(verifyData.error ?? "Payment verification failed")
              setBusyTier(null)
              return
            }

            const newLabel: string = verifyData.newTier
              ? getTierLabel(verifyData.newTier as ProductTier)
              : toLabel
            const newExpiresAt: string | undefined = verifyData.newExpiresAt
            const dateText = newExpiresAt
              ? formatIstDate(newExpiresAt)
              : "the end of the next billing period"
            toast.success(
              `Upgraded to ${newLabel}. New tier active until ${dateText}.`,
            )
            startTransition(() => {
              router.refresh()
            })
          } catch (err) {
            toast.error(
              err instanceof Error
                ? err.message
                : "Payment verification failed. Contact support.",
            )
          } finally {
            setBusyTier(null)
          }
        },
        modal: {
          ondismiss: () => {
            toast.message("Payment cancelled")
            setBusyTier(null)
          },
        },
      }

      const rzp = new (window as unknown as WindowWithRazorpay).Razorpay(
        options,
      )
      rzp.open()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      )
      setBusyTier(null)
      setDialog({ kind: "closed" })
    }
  }

  const confirmDowngrade = async () => {
    if (dialog.kind !== "downgrade") return
    const { toTier } = dialog
    setBusyTier(toTier)

    try {
      const res = await fetch("/api/subscription/downgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_tier: toTier }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to schedule downgrade")
        setBusyTier(null)
        setDialog({ kind: "closed" })
        return
      }

      const dateText = data.effectiveAt
        ? formatIstDate(data.effectiveAt)
        : formatIstDate(expiresAt)
      toast.success(`Downgrade scheduled for ${dateText}.`)
      setDialog({ kind: "closed" })
      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      )
      setDialog({ kind: "closed" })
    } finally {
      setBusyTier(null)
    }
  }

  const currentLabel = getTierLabel(currentTier)
  const expiresAtFormatted = formatIstDate(expiresAt)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
        {tiers.map((tier) => {
          const isCurrent = tier.tier === currentTier
          const targetRank = getTierRank(tier.tier)
          const isUpgrade = targetRank > currentRank
          const isDowngrade = targetRank < currentRank
          const bullets = TIER_BULLETS[tier.tier]
          const tierBusy = busyTier === tier.tier && isPending

          let buttonLabel: string
          if (isCurrent) {
            buttonLabel = "Current plan"
          } else if (isUpgrade) {
            buttonLabel = `Upgrade to ${tier.tierLabel} — ${formatINR(tier.monthlyPaise)}/month`
          } else {
            buttonLabel = `Downgrade to ${tier.tierLabel} — ${formatINR(tier.monthlyPaise)}/month`
          }

          let hint: string | null = null
          if (!isCurrent && isUpgrade) {
            const proRate = computeProratePaiseDisplay({
              currentLockedPaise,
              newMonthlyPaise: tier.monthlyPaise,
              startsAt,
              expiresAt,
              now,
            })
            hint = `Pay only ${formatINR(proRate)} now for the remainder of this period; new tier starts immediately.`
          } else if (!isCurrent && isDowngrade) {
            hint = `You will keep ${currentLabel} access until ${expiresAtFormatted}, then drop to ${tier.tierLabel}. No refund.`
          }

          return (
            <Card
              key={tier.tier}
              className={
                isCurrent
                  ? "relative border-2 border-[#E53935]"
                  : "relative border-border"
              }
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-[#E53935] px-3 py-1 text-xs font-semibold text-white">
                    Current plan
                  </span>
                </div>
              )}

              <CardHeader className="pb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Tier {tier.tierRank}
                </p>
                <CardTitle className="text-xl font-bold">
                  {tier.tierLabel}
                </CardTitle>
                <p className="mt-2 text-2xl font-bold">
                  {formatINR(tier.monthlyPaise)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </p>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="space-y-2 flex-1">
                  {bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2 text-xs"
                    >
                      <Check className="size-3.5 text-green-500 shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm"
                    disabled
                  >
                    Current
                  </Button>
                ) : (
                  <>
                    <Button
                      variant={isUpgrade ? "default" : "outline"}
                      className="w-full h-10 text-sm"
                      disabled={allChangesLocked || tierBusy}
                      onClick={() => handleClick(tier)}
                    >
                      {tierBusy ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        buttonLabel
                      )}
                    </Button>
                    {hint && (
                      <p className="text-xs text-muted-foreground">{hint}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {lockedReason && (
        <p className="text-xs text-muted-foreground italic text-center">
          {lockedReason}
        </p>
      )}

      {/* Upgrade confirmation dialog */}
      <Dialog
        open={dialog.kind === "upgrade"}
        onOpenChange={(open) => {
          if (!open && !busyTier) setDialog({ kind: "closed" })
        }}
      >
        <DialogContent>
          {dialog.kind === "upgrade" && (
            <>
              <DialogHeader>
                <DialogTitle>Upgrade to {dialog.toLabel}</DialogTitle>
                <DialogDescription>
                  Pay {formatINR(dialog.proRatePaise)} now for the remainder of
                  this period. Your new tier starts immediately. From the next
                  billing date, you will be charged{" "}
                  {formatINR(dialog.newMonthlyPaise)}/month.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialog({ kind: "closed" })}
                  disabled={!!busyTier}
                >
                  Cancel
                </Button>
                <Button onClick={confirmUpgrade} disabled={!!busyTier}>
                  {busyTier ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Continue to payment"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Downgrade confirmation dialog */}
      <Dialog
        open={dialog.kind === "downgrade"}
        onOpenChange={(open) => {
          if (!open && !busyTier) setDialog({ kind: "closed" })
        }}
      >
        <DialogContent>
          {dialog.kind === "downgrade" && (
            <>
              <DialogHeader>
                <DialogTitle>Downgrade to {dialog.toLabel}</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      You will keep {currentLabel} access until{" "}
                      {expiresAtFormatted}. After that, your tier drops to{" "}
                      {dialog.toLabel} and you will be billed{" "}
                      {formatINR(dialog.newMonthlyPaise)}/month for{" "}
                      {dialog.toLabel}.
                    </p>
                    <p>
                      No refund is issued for the remainder of this period.
                    </p>
                    <p>
                      This change cannot be reversed for one billing period.
                    </p>
                    <p>Continue?</p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialog({ kind: "closed" })}
                  disabled={!!busyTier}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDowngrade}
                  disabled={!!busyTier}
                >
                  {busyTier ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule downgrade"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
