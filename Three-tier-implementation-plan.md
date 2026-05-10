# Three-Tier Implementation Plan

**Status:** Spec locked, build not started
**Last updated:** 2026-05-10
**Scope:** Convert the Community App from a single ₹499 plan with milestone bands into a three-tier subscription system with per-tier access restrictions.

This plan is intentionally focused. Workshops content production, drumbeat cadence, founding member launch play, and Reset event are explicitly **out of scope** for this build. They appear in the broader SuperFounder plan but are not addressed here.

---

## 1. The three tiers

| Tier | Price (founding band) | One-line pitch |
|---|---|---|
| **Library** | ₹499 / month | Read, post, learn. Library content + community feed + delayed replays. |
| **Workshop** | ₹1,299 / month | Library + monthly live workshop (attend, hot-seat) + immediate replays. |
| **AI Lab** | ₹1,499 / month | Workshop + monthly AI workshop (live + replays) + Reset early-bird. |

Tiers are strictly hierarchical. AI Lab includes everything in Workshop, which includes everything in Library.

Internal ranks for access checks: Library = 1, Workshop = 2, AI Lab = 3.

The live event inside Workshop tier (currently called "Genius Workshop" in the SuperFounder plan) will be renamed later. Treat it as "the Workshop event" in code for now.

---

## 2. Access matrix (definitive)

| Resource | Library | Workshop | AI Lab |
|---|---|---|---|
| Community feed (read + post) | ✅ | ✅ | ✅ |
| Templates library | ✅ | ✅ | ✅ |
| Frameworks library | ✅ | ✅ | ✅ |
| Walls library (Reels archive) | ✅ | ✅ | ✅ |
| Weekly prompts | ✅ | ✅ | ✅ |
| Newsletter | ✅ | ✅ | ✅ |
| Workshop event **replays** | After 30-day delay (per workshop) | Immediate | Immediate |
| Workshop event **live attendance** | ❌ | ✅ | ✅ |
| Hot-seat application | ❌ | ✅ | ✅ |
| Priority on ₹5K diagnostic slots | ❌ | ✅ | ✅ |
| AI Lab event **replays** | ❌ never | ❌ never | ✅ |
| AI Lab event **live attendance** | ❌ | ❌ | ✅ |
| Reset early-bird ticket window | ❌ | ❌ | ✅ |
| Tier badge on profile | "Library" | "Workshop" | "AI Lab" |

Two non-obvious rules:
- **30-day delay is per-workshop**, not "anything from the last 30 days." A workshop recorded on May 1 becomes visible to Library tier on May 31.
- **AI Lab event replays are permanently exclusive to T3.** They are not just delayed for lower tiers — they are never visible to Library or Workshop members. This is the core T3 lock-in.

---

## 3. Locked product decisions

| ID | Decision | Choice |
|---|---|---|
| **D1** | Upgrade timing | Pro-rate immediately. Member pays the difference for the remainder of the billing period; new tier access starts now. |
| **D2** | Downgrade timing | End-of-period. Member keeps current tier until the next billing date, then drops. No refund. |
| **D3** | Replay access after downgrade | Strict. Once they're T1, T1 rules apply universally. No grandfathered access to fresh replays from when they were T2. |
| **D4** | Founding price lock | Per-tier-of-record. The founding lock applies only to the tier the member joined at. Upgrading later goes at the current band's price for the new tier. |
| **D5** | Tier-switching frequency | One tier change per billing period. Prevents gaming the workshop calendar (upgrade-attend-downgrade pattern). |

---

## 4. Data model changes

### 4.1 `subscriptions` table

Add columns:
- `tier` — enum: `'library' | 'workshop' | 'ai_lab'`
- `tier_rank` — int (1, 2, 3) — denormalised for fast access checks in middleware and RLS
- `locked_price_paise` — int — the price the member signed up at (preserved for life as long as they don't cancel)
- `band_at_signup` — enum or text — which milestone band they joined in (for reporting and customer support)
- `razorpay_plan_id` — text — the specific Razorpay plan they're subscribed to (immutable per subscription)

### 4.2 `profiles` table

Add (or surface via view):
- `active_tier` — denormalised from active subscription, refreshed on subscription state change

### 4.3 New table: `tier_changes`

Audit trail for upgrades/downgrades.
- `id`, `user_id`, `from_tier`, `to_tier`, `effective_at`, `requested_at`, `pro_rated_paise`, `created_at`

Used to enforce D5 (one change per billing period) and for support/debugging.

### 4.4 `lib/plans.ts` rewrite

Replace single-tier-with-bands shape with a 2D matrix: 3 tiers × 5 bands. Helpers needed:
- `getCurrentBandForTier(tier, activeCount)` — what band is currently selling for this tier?
- `getPlansForCurrentMembers(activeCount)` — returns three pricing cards for the public plans page
- `getTierRank(tier)` — returns 1, 2, or 3
- `tierMeetsRequirement(userTier, requiredTier)` — the access check primitive

Founding band 1–100 prices stay at ₹499 / ₹1,299 / ₹1,499. Subsequent bands per the SuperFounder plan's pricing table.

---

## 5. Razorpay setup

### 5.1 Plans

At launch, three Razorpay plans exist (one per tier at founding band price):
- `library_founding_499` — ₹499/month
- `workshop_founding_1299` — ₹1,299/month
- `ai_lab_founding_1499` — ₹1,499/month

When the founding band fills, three new plans are created for Band 2 prices. Old members stay on their old plan IDs (Razorpay plans are immutable). No automated migration — old plan IDs simply continue to bill the old price for as long as the subscription stays active.

### 5.2 Plan IDs

Stored in environment variables (one var per active plan) and read by `lib/plans.ts`. Public plans page reads which plan IDs are "currently selling" from a small config.

### 5.3 Upgrade flow (D1: pro-rate)

1. User clicks "Upgrade to Workshop" on subscription page
2. API computes pro-rated paise for remaining days in current period
3. Razorpay payment for the pro-rated amount (one-time)
4. On payment success: cancel old subscription, create new subscription on new tier's plan ID, update `subscriptions` row, write to `tier_changes`
5. Tier rank updates immediately, replay access recomputes

### 5.4 Downgrade flow (D2: end-of-period)

1. User clicks "Downgrade to Library" on subscription page
2. API marks current subscription with `pending_downgrade_to: 'library'` and `effective_at: <next_billing_date>`
3. Webhook on Razorpay's renewal event triggers the actual downgrade — cancel old plan, create new subscription on Library plan ID
4. Until then, current tier access remains intact

### 5.5 Tier-change frequency lock (D5)

Before allowing upgrade or downgrade: query `tier_changes` for this user in the current billing period. If one already exists, block with a clear message ("You can change tier again on [next billing date]").

---

## 6. Access enforcement (3 layers)

### 6.1 UI layer — `components/`
React components consume `useUserTier()` hook and conditionally render. Hide RSVP buttons, "Upgrade" CTAs, locked sections. Not a security layer — purely UX.

### 6.2 API layer — `app/api/`
Every protected route calls a shared `requireTier(req, minRank)` helper that returns 403 with a clear error if insufficient. Routes that need tier checks:
- `app/api/workshops/*` — Workshop tier minimum for live RSVP
- `app/api/workshops/[id]/replay` — Library OK if ≥30 days old, else Workshop+
- `app/api/ai-lab/*` — AI Lab only
- `app/api/diagnostics/*` — Workshop tier minimum

### 6.3 Database layer — Supabase RLS
The strongest gate. New SQL function:
```sql
CREATE FUNCTION current_user_tier_rank() RETURNS int ...
```
Reads the active subscription for `auth.uid()` and returns 1, 2, 3, or 0 (no active subscription).

RLS policies on workshop and AI Lab tables enforce `current_user_tier_rank() >= required_rank` with the 30-day-delay carve-out for Library tier on workshop replays.

---

## 7. Migration path for existing members

Current members are on the legacy single-tier system (founding/early/growth/premium bands at ₹499/₹799/₹999/₹1,499).

One-time migration script:
1. For every active subscription, set `tier = 'library'`, `tier_rank = 1`
2. Preserve their `locked_price_paise` from current plan
3. Map their old band name to a `band_at_signup` value
4. Their existing Razorpay subscription continues unchanged — only metadata updates

Net effect: every existing member becomes a Library tier member at their existing locked price. Nothing breaks for them. If they want Workshop or AI Lab, they upgrade through the normal D1 pro-rated flow.

---

## 8. Build order

Phases run sequentially. Each phase ends in a testable, reversible state.

### Phase 1 — Schema + plans library (~2 days)
- Migration SQL: add columns to `subscriptions`, create `tier_changes` table, add `current_user_tier_rank()` function
- Rewrite `lib/plans.ts` to 3-tier × 5-band shape
- Backfill migration for existing members
- Unit tests on tier helpers

### Phase 2 — Razorpay plans + signup flow (~2 days)
- Create three Razorpay plans at founding band prices
- Update `(public)/plans/` page to render 3 tier cards
- Update `app/api/razorpay/create-order/` and webhook handler to record tier
- Update `app/api/onboarding/create-subscription/` to accept tier choice

### Phase 3 — Access enforcement (~2–3 days)
- `requireTier()` helper in `lib/auth.ts` (or similar)
- RLS policies on workshop / AI Lab tables (tables themselves come in Phase 4 but policies are stubbed now)
- `useUserTier()` hook for UI
- Tier badge component on profile
- Middleware updates to surface tier in request context

### Phase 4 — Workshop and AI Lab tables (~2 days)
- New tables: `workshops`, `workshop_replays`, `ai_lab_events`, `ai_lab_replays`, `workshop_rsvps`, `hot_seat_applications`
- RLS policies enforced per access matrix
- Admin pages to schedule events and upload replays
- Member-facing pages (gated by tier)

### Phase 5 — Upgrade/downgrade flows (~2 days)
- Upgrade API + UI (D1: pro-rate)
- Downgrade API + UI (D2: end-of-period)
- D5 frequency check
- `tier_changes` audit writes

### Phase 6 — Polish + cutover (~1 day)
- Tier-aware empty states, locked-content placeholders, "Upgrade to unlock" CTAs
- End-to-end test on staging with real Razorpay test mode
- Production migration

**Total estimate: ~10–12 working days.**

---

## 9. What this plan deliberately does NOT cover

These are real items but they're separate work, not blocked by this plan, and not blocking it:

- Removing the 7-level engagement system, daily streaks, GP caps (cleanup work, separate PR)
- Daily prompts → weekly cadence change
- Monday Framework / Friday Founder Numbers content drumbeat
- Founding member badge UI and live counter on plans page
- Reset standalone event ticketing
- Workshop event production (Zoom setup, recording pipeline, replay editing)
- Naming the Workshop tier's live event (currently "Genius Workshop" in plan, will be renamed later)

Everything in this plan can be built and shipped without touching any of the above.

---

## 10. Open items still to settle (non-blocking)

- **Plan visibility on the public page when a band is full.** When founding 100 fills, do new visitors see "Founding band sold out — joining Band 2" or just the new Band 2 prices? UX call.
- **Cancellation messaging.** Today the app supports cancel; under the new tier system, do we offer downgrade as a soft-cancel option in the cancel flow? Likely yes.
- **Annual plans.** Current `lib/plans.ts` has annual variants. Do all three tiers have annual options? Plan implies monthly only — confirm before Phase 2.

These can be answered during build phase. They don't block the schema or Razorpay setup.
