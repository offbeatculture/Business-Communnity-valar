// Member ↔ Razorpay reconciliation.
//
// Pure: takes members, their database subscriptions and the mirrored Razorpay
// data, and returns one row per member saying what each side believes and
// where they disagree. No I/O, so it runs the same on the server and in tests.
//
// Every rule here is something that was found by hand in October/November
// 2026 — renewals the webhook dropped, people added with no payment, a
// ₹14,999 yearly payer stored as ₹1,499 monthly, a paying member left on the
// restricted tier. The admin Reconciliation page shows these as flags with a
// one-click fix.

export type Member = {
  userId: string
  email: string
  name: string | null
  phone: string | null
  role: string | null
  lastSignIn: string | null
  joinedAt: string | null
  /** False when the account exists but profile setup was never finished. */
  hasProfile: boolean
}

export type DbSub = {
  id: string
  user_id: string
  plan_label: string | null
  plan_name: string | null
  tier: string | null
  amount_paid: number | null
  status: string | null
  starts_at: string | null
  expires_at: string | null
  razorpay_subscription_id: string | null
  razorpay_payment_id: string | null
  recurring_status: string | null
  created_at: string | null
}

export type RzpSub = {
  id: string
  plan_id: string | null
  status: string | null
  email: string | null
  contact: string | null
  customer_name: string | null
  paid_count: number | null
  created_at: string | null
  current_start: string | null
  current_end: string | null
  charge_at: string | null
  short_url: string | null
}

export type RzpPayment = {
  id: string
  amount: number | null
  amount_refunded: number | null
  status: string | null
  method: string | null
  email: string | null
  contact: string | null
  order_id: string | null
  invoice_id: string | null
  subscription_id: string | null
  description: string | null
  notes: unknown
  created_at: string | null
}

export type RzpPlan = {
  id: string
  name: string | null
  amount: number | null
  period: string | null
  interval: number | null
  is_lifinity: boolean
}

export type FixAction =
  | { action: "extend_expiry"; subscriptionId: string; expiresAt: string; label: string }
  | { action: "set_amount"; subscriptionId: string; amountPaise: number; yearly: boolean; label: string }
  | { action: "set_tier"; subscriptionId: string; label: string }
  | { action: "link_payment"; subscriptionId: string; paymentId?: string; rzpSubscriptionId?: string; label: string }
  | { action: "mark_expired"; subscriptionId: string; label: string }
  | { action: "grant_complimentary"; userId: string; planLabel: "Staff (complimentary)" | "Karma Recode (lifetime)"; label: string }

export type FlagCode =
  | "paid_not_recorded"
  | "tier_restricted"
  | "amount_mismatch"
  | "unlinked_payment"
  | "no_payment"
  | "rzp_ended"
  | "staff_without_lifetime"
  | "other_product_only"
  | "using_after_expiry"
  | "paid_no_account"
  | "setup_unfinished"

export type Severity = "high" | "medium" | "low" | "info"

export type Flag = {
  code: FlagCode
  severity: Severity
  message: string
  fix?: FixAction
}

export type PaymentKind = "lifinity_plan" | "lifinity_one_off" | "other_subscription" | "other"

export type ClassifiedPayment = RzpPayment & {
  kind: PaymentKind
  productLabel: string
}

export type MemberCategory = "staff" | "karma_recode" | "razorpay" | "manual" | "no_membership"

export type ReconRow = {
  key: string
  member: Member | null
  category: MemberCategory
  dbSub: DbSub | null
  access: "active" | "lapsed" | "none"
  dbExpires: string | null
  rzpSub: RzpSub | null
  rzpPaidUntil: string | null
  payments: ClassifiedPayment[]
  lifinityPayments: ClassifiedPayment[]
  lastLifinityPayment: ClassifiedPayment | null
  flags: Flag[]
  topSeverity: Severity | null
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** One-off amounts that are Lifinity prices (paise). */
export const LIFINITY_PRICES = new Set([99900, 149900, 999000, 1499900])
/** Of those, the ones that buy a year. */
export const YEARLY_PRICES = new Set([999000, 1499900])

const STAFF_ROLES = new Set(["admin", "recording_admin", "staff"])
/** Team accounts, whatever their role. */
const STAFF_EMAIL_DOMAINS = ["@offbeatculture.co.in"]
export const STAFF_COMP_LABEL = "Staff (complimentary)"
export const KARMA_LABEL = "Karma Recode (lifetime)"
const LIFETIME_ISO = "2099-12-31T18:29:59.000Z" // 23:59:59 IST
const DAY = 24 * 3600 * 1000
/** Don't flag dates that differ by less than this — time zones, capture lag. */
const TOLERANCE = 1.5 * DAY

const ENDED_RZP = new Set(["cancelled", "completed", "expired", "halted"])
/** Razorpay states in which current_end really is paid for. */
const PAID_UP_RZP = new Set(["active", "authenticated", "completed"])

// ─── Helpers ───────────────────────────────────────────────────────────────

const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN)
const rupees = (paise: number | null | undefined) =>
  `₹${((paise ?? 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
const fmt = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
    : "—"
export { rupees, fmt }

function isValid(sub: DbSub, now: number) {
  return sub.status === "active" && sub.tier === "membership" && ms(sub.expires_at) > now
}

function noteString(notes: unknown, key: string): string | null {
  if (notes && typeof notes === "object" && !Array.isArray(notes)) {
    const v = (notes as Record<string, unknown>)[key]
    return typeof v === "string" && v.trim() ? v.trim() : null
  }
  return null
}

export function classifyPayment(
  p: RzpPayment,
  lifinitySubIds: Set<string>
): ClassifiedPayment {
  if (p.subscription_id && lifinitySubIds.has(p.subscription_id)) {
    return { ...p, kind: "lifinity_plan", productLabel: "Lifinity plan" }
  }
  if (p.invoice_id) {
    return { ...p, kind: "other_subscription", productLabel: "Other subscription (e.g. EIC)" }
  }
  const product = noteString(p.notes, "product_name")
  if (product) return { ...p, kind: "other", productLabel: product }
  if (p.amount != null && LIFINITY_PRICES.has(p.amount)) {
    return { ...p, kind: "lifinity_one_off", productLabel: "One-off at a Lifinity price" }
  }
  return { ...p, kind: "other", productLabel: "Other payment" }
}

function paidUntilFromPayment(p: ClassifiedPayment): number {
  const start = ms(p.created_at)
  return start + (p.amount != null && YEARLY_PRICES.has(p.amount) ? 365 : 30) * DAY
}

function worst(flags: Flag[]): Severity | null {
  for (const s of ["high", "medium", "low", "info"] as Severity[]) {
    if (flags.some((f) => f.severity === s)) return s
  }
  return null
}

// ─── Main ──────────────────────────────────────────────────────────────────

export function reconcile(input: {
  members: Member[]
  dbSubs: DbSub[]
  rzpSubs: RzpSub[]
  payments: RzpPayment[]
  plans: RzpPlan[]
  now?: number
}): ReconRow[] {
  const now = input.now ?? Date.now()

  const lifinityPlanIds = new Set(input.plans.filter((p) => p.is_lifinity).map((p) => p.id))
  const rzpSubById = new Map(input.rzpSubs.map((s) => [s.id, s]))
  const lifinitySubs = input.rzpSubs.filter((s) => s.plan_id && lifinityPlanIds.has(s.plan_id))
  const lifinitySubIds = new Set(lifinitySubs.map((s) => s.id))

  const payments = input.payments
    .filter((p) => p.status === "captured" || p.status === "refunded")
    .map((p) => classifyPayment(p, lifinitySubIds))

  // Index payments and subscriptions by every way they can point at a person.
  const payByEmail = new Map<string, ClassifiedPayment[]>()
  const payByPhone = new Map<string, ClassifiedPayment[]>()
  const payBySub = new Map<string, ClassifiedPayment[]>()
  const push = <T>(m: Map<string, T[]>, k: string | null | undefined, v: T) => {
    if (!k) return
    const list = m.get(k)
    if (list) list.push(v)
    else m.set(k, [v])
  }
  for (const p of payments) {
    push(payByEmail, p.email?.toLowerCase(), p)
    push(payByPhone, p.contact, p)
    push(payBySub, p.subscription_id, p)
  }

  const subsByUser = new Map<string, DbSub[]>()
  for (const s of input.dbSubs) push(subsByUser, s.user_id, s)

  const claimedPayments = new Set<string>()
  const claimedRzpSubs = new Set<string>()
  const rows: ReconRow[] = []

  for (const member of input.members) {
    const subs = (subsByUser.get(member.userId) ?? []).sort((a, b) => ms(b.expires_at) - ms(a.expires_at))
    const valid = subs.filter((s) => isValid(s, now))
    const dbSub = valid[0] ?? subs.find((s) => s.status === "active") ?? subs[0] ?? null

    const access: ReconRow["access"] = !dbSub ? "none" : valid.length ? "active" : "lapsed"

    // The person's Razorpay subscription: the one their record points at,
    // else a paid Lifinity subscription under their email or phone.
    let rzpSub: RzpSub | null = null
    for (const s of subs) {
      const found = s.razorpay_subscription_id ? rzpSubById.get(s.razorpay_subscription_id) : undefined
      if (found && found.plan_id && lifinityPlanIds.has(found.plan_id)) {
        rzpSub = found
        break
      }
    }
    if (!rzpSub) {
      rzpSub =
        lifinitySubs
          .filter(
            (s) =>
              (s.paid_count ?? 0) > 0 &&
              ((s.email && s.email.toLowerCase() === member.email) ||
                (s.contact && member.phone && s.contact === member.phone))
          )
          .sort((a, b) => ms(b.created_at) - ms(a.created_at))[0] ?? null
    }
    if (rzpSub) claimedRzpSubs.add(rzpSub.id)

    // All their payments, by email, phone, or their subscriptions.
    const mine = new Map<string, ClassifiedPayment>()
    for (const p of payByEmail.get(member.email) ?? []) mine.set(p.id, p)
    if (member.phone) for (const p of payByPhone.get(member.phone) ?? []) mine.set(p.id, p)
    for (const s of subs) for (const p of payBySub.get(s.razorpay_subscription_id ?? "") ?? []) mine.set(p.id, p)
    if (rzpSub) for (const p of payBySub.get(rzpSub.id) ?? []) mine.set(p.id, p)
    const memberPayments = [...mine.values()].sort((a, b) => ms(a.created_at) - ms(b.created_at))
    memberPayments.forEach((p) => claimedPayments.add(p.id))

    const lifinityPayments = memberPayments.filter(
      (p) => (p.kind === "lifinity_plan" || p.kind === "lifinity_one_off") && p.status === "captured"
    )
    const lastLifinityPayment = lifinityPayments[lifinityPayments.length - 1] ?? null

    // The payment that covers the furthest date. A ₹14,999 year bought in
    // September outlasts ₹999 months paid since, so it — not simply the most
    // recent payment — says what they've paid for.
    const governingPayment =
      [...lifinityPayments].sort((a, b) => paidUntilFromPayment(b) - paidUntilFromPayment(a))[0] ?? null

    // What Razorpay says they've paid up to.
    const candidates: number[] = []
    // Razorpay's cycle end only means "paid until" while the subscription is
    // in good standing. Once a charge fails (pending / halted) or it is
    // paused or cancelled, the current cycle may never have been paid — so
    // there we rely on the paid invoices themselves (governingPayment).
    if (rzpSub && (rzpSub.paid_count ?? 0) > 0 && rzpSub.current_end && PAID_UP_RZP.has(rzpSub.status ?? "")) {
      candidates.push(ms(rzpSub.current_end))
    }
    if (governingPayment) candidates.push(paidUntilFromPayment(governingPayment))
    const paidUntilMs = candidates.length ? Math.max(...candidates) : NaN
    const rzpPaidUntil = Number.isFinite(paidUntilMs) ? new Date(paidUntilMs).toISOString() : null

    const label = (dbSub?.plan_label ?? "").trim()
    const isStaff =
      STAFF_ROLES.has(member.role ?? "") ||
      STAFF_EMAIL_DOMAINS.some((d) => member.email.endsWith(d)) ||
      label === STAFF_COMP_LABEL
    const category: MemberCategory = isStaff
      ? "staff"
      : label.startsWith("Karma Recode")
        ? "karma_recode"
        : !dbSub
          ? "no_membership"
          : dbSub.razorpay_subscription_id || dbSub.razorpay_payment_id
            ? "razorpay"
            : "manual"

    const flags: Flag[] = []
    const dbExpiresMs = ms(dbSub?.expires_at)

    if (category === "staff") {
      const hasLifetime = subs.some((s) => s.plan_label === STAFF_COMP_LABEL && isValid(s, now))
      if (!hasLifetime) {
        flags.push({
          code: "staff_without_lifetime",
          severity: "medium",
          message: "Staff account without the complimentary lifetime membership — would be locked out when access is enforced.",
          fix: {
            action: "grant_complimentary",
            userId: member.userId,
            planLabel: STAFF_COMP_LABEL,
            label: "Give lifetime staff membership",
          },
        })
      }
    } else if (category !== "karma_recode" && dbSub) {
      // 1. Razorpay says they paid further than we recorded.
      if (rzpPaidUntil && (!Number.isFinite(dbExpiresMs) || paidUntilMs > dbExpiresMs + TOLERANCE)) {
        flags.push({
          code: "paid_not_recorded",
          severity: "high",
          message: `Razorpay shows them paid until ${fmt(rzpPaidUntil)}, but their membership ends ${fmt(dbSub.expires_at)}.`,
          fix: {
            action: "extend_expiry",
            subscriptionId: dbSub.id,
            expiresAt: rzpPaidUntil,
            label: `Extend to ${fmt(rzpPaidUntil)}`,
          },
        })
      }

      // 2. Paid, but on the restricted tier.
      if (dbSub.tier !== "membership" && lifinityPayments.length) {
        flags.push({
          code: "tier_restricted",
          severity: "high",
          message: `Paid ${rupees(governingPayment?.amount)} but is on the restricted "${dbSub.tier}" tier.`,
          fix: { action: "set_tier", subscriptionId: dbSub.id, label: "Give full membership" },
        })
      }

      // 3. Recorded amount isn't what they paid.
      if (governingPayment && governingPayment.amount != null && dbSub.amount_paid !== governingPayment.amount) {
        const yearly = YEARLY_PRICES.has(governingPayment.amount)
        flags.push({
          code: "amount_mismatch",
          severity: "medium",
          message: `Recorded as ${rupees(dbSub.amount_paid)}, but they paid ${rupees(governingPayment.amount)}${yearly ? " for a year" : ""} on ${fmt(governingPayment.created_at)}.`,
          fix: {
            action: "set_amount",
            subscriptionId: dbSub.id,
            amountPaise: governingPayment.amount,
            yearly,
            label: `Record ${rupees(governingPayment.amount)}${yearly ? " yearly" : ""}`,
          },
        })
      }

      // 4. Payment exists but the record doesn't point at it.
      if (!dbSub.razorpay_subscription_id && !dbSub.razorpay_payment_id && governingPayment) {
        const lastLifinityPayment = governingPayment
        const viaSub = lastLifinityPayment.kind === "lifinity_plan" ? lastLifinityPayment.subscription_id : null
        flags.push({
          code: "unlinked_payment",
          severity: "low",
          message: `Not linked to their Razorpay ${viaSub ? "subscription" : "payment"} (${viaSub ?? lastLifinityPayment.id}).`,
          fix: viaSub
            ? { action: "link_payment", subscriptionId: dbSub.id, rzpSubscriptionId: viaSub, label: "Link Razorpay subscription" }
            : { action: "link_payment", subscriptionId: dbSub.id, paymentId: lastLifinityPayment.id, label: "Link Razorpay payment" },
        })
      }

      // 5. No payment of any kind, anywhere.
      if (!memberPayments.length && !rzpSub) {
        flags.push({
          code: "no_payment",
          severity: access === "active" ? "high" : "medium",
          message:
            access === "active"
              ? "Has access, but no Razorpay payment exists under their email or phone."
              : "No Razorpay payment exists under their email or phone.",
          fix:
            access === "active"
              ? { action: "mark_expired", subscriptionId: dbSub.id, label: "End access" }
              : undefined,
        })
      } else if (!lifinityPayments.length && memberPayments.length && !rzpSub) {
        const total = memberPayments.filter((p) => p.status === "captured").reduce((s, p) => s + (p.amount ?? 0), 0)
        flags.push({
          code: "other_product_only",
          severity: "info",
          message: `Only paid for other products (${memberPayments.length} payment${memberPayments.length === 1 ? "" : "s"}, ${rupees(total)}) — e.g. Karma Recode or EIC.`,
        })
      }

      // 6. Razorpay subscription ended, but we still give access beyond it.
      if (
        rzpSub &&
        ENDED_RZP.has(rzpSub.status ?? "") &&
        access === "active" &&
        rzpSub.current_end &&
        dbExpiresMs > ms(rzpSub.current_end) + TOLERANCE
      ) {
        flags.push({
          code: "rzp_ended",
          severity: "medium",
          message: `Razorpay subscription is ${rzpSub.status}; paid only until ${fmt(rzpSub.current_end)} but membership runs to ${fmt(dbSub.expires_at)}.`,
          fix: {
            action: "extend_expiry",
            subscriptionId: dbSub.id,
            expiresAt: rzpSub.current_end,
            label: `End at ${fmt(rzpSub.current_end)}`,
          },
        })
      }
    }

    // 8. Has an account (and often a payment) but never finished profile
    //    setup, so the site keeps sending them to /setup. These looked like
    //    "paid, no account" until accounts without profiles were included.
    if (!member.hasProfile && category !== "staff") {
      flags.push({
        code: "setup_unfinished",
        severity: lifinityPayments.length || rzpSub ? "high" : "low",
        message: lifinityPayments.length || rzpSub
          ? "Paid and has an account, but never finished profile setup — send them a login link and ask them to complete setup."
          : "Has an account but never finished profile setup.",
      })
    }

    // 7. Using the site after their membership ran out (access isn't enforced).
    if (access !== "active" && member.lastSignIn && Number.isFinite(dbExpiresMs) && ms(member.lastSignIn) > dbExpiresMs) {
      flags.push({
        code: "using_after_expiry",
        severity: "info",
        message: `Logged in ${fmt(member.lastSignIn)}, after their membership ended ${fmt(dbSub?.expires_at)}.`,
      })
    }

    rows.push({
      key: member.userId,
      member,
      category,
      dbSub,
      access,
      dbExpires: dbSub?.expires_at ?? null,
      rzpSub,
      rzpPaidUntil,
      payments: memberPayments,
      lifinityPayments,
      lastLifinityPayment,
      flags,
      topSeverity: worst(flags),
    })
  }

  // People who paid on a Lifinity plan but have no account here.
  for (const s of lifinitySubs) {
    if (claimedRzpSubs.has(s.id) || (s.paid_count ?? 0) === 0) continue
    const subPayments = (payBySub.get(s.id) ?? []).filter((p) => !claimedPayments.has(p.id))
    if (!subPayments.length) continue
    const last = subPayments[subPayments.length - 1]
    const flags: Flag[] = [
      {
        code: "paid_no_account",
        severity: "high",
        message: `Paid ${rupees(last.amount)} on a Lifinity plan (${fmt(last.created_at)}) but has no account here.`,
      },
    ]
    rows.push({
      key: `rzp:${s.id}`,
      member: null,
      category: "no_membership",
      dbSub: null,
      access: "none",
      dbExpires: null,
      rzpSub: s,
      rzpPaidUntil: s.current_end,
      payments: subPayments,
      lifinityPayments: subPayments,
      lastLifinityPayment: last,
      flags,
      topSeverity: "high",
    })
  }

  return rows
}

export const LIFETIME_EXPIRY = LIFETIME_ISO

export const FLAG_LABELS: Record<FlagCode, string> = {
  paid_not_recorded: "Paid, not recorded",
  tier_restricted: "Paid, restricted tier",
  amount_mismatch: "Wrong amount",
  unlinked_payment: "Payment not linked",
  no_payment: "No payment found",
  rzp_ended: "Razorpay ended",
  staff_without_lifetime: "Staff without lifetime",
  other_product_only: "Other products only",
  using_after_expiry: "Using after expiry",
  paid_no_account: "Paid, no account",
  setup_unfinished: "Setup never finished",
}

export const CATEGORY_LABELS: Record<MemberCategory, string> = {
  staff: "Staff",
  karma_recode: "Karma Recode",
  razorpay: "Razorpay",
  manual: "Added by admin",
  no_membership: "No membership",
}
