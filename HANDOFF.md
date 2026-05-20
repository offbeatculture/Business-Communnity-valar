# Three-Tier Subscription System — Team Handoff

**Branch:** `feature/three-tier-system`
**PR:** https://github.com/offbeatculture/Business-Communnity/pull/4
**Status:** Code complete on PR. Schema migrations applied to production Supabase. **Not yet merged to main.**

---

## What's shipped

The Community App is being converted from a single ₹499 plan into three parallel tiers:

| Tier | Price (founding band) | What it unlocks |
|---|---|---|
| **Library** | ₹499 / month | Community feed, library content, workshop replays (after 30-day delay) |
| **Workshop** | ₹1,299 / month | Library + live monthly workshop + hot-seat applications + immediate replays |
| **AI Lab** | ₹1,499 / month | Workshop + monthly AI Lab event + Reset early-bird |

Includes: tier-aware access (UI, API, and RLS layers), upgrade flow (pro-rated immediately), downgrade flow (end-of-period), admin event scheduler, member RSVP + hot-seat applications, `/subscription` page with tier-change UX.

Full spec: `Three-tier-implementation-plan.md` in the repo root.

---

## What you need to do (3 steps)

### Step 1 — Create three Razorpay plans

In the Razorpay dashboard (https://dashboard.razorpay.com → Subscriptions → Plans → Create Plan):

| Plan name | Billing | Amount (paise) | Amount (₹) |
|---|---|---|---|
| `Library Monthly` | Monthly | 49900 | ₹499 |
| `Workshop Monthly` | Monthly | 129900 | ₹1,299 |
| `AI Lab Monthly` | Monthly | 149900 | ₹1,499 |

Copy each `plan_xxx` ID. Paste into two places:

**A) Local `.env.local`** (for dev):
```
RAZORPAY_PLAN_ID_LIBRARY_MONTHLY=plan_xxx
RAZORPAY_PLAN_ID_WORKSHOP_MONTHLY=plan_xxx
RAZORPAY_PLAN_ID_AI_LAB_MONTHLY=plan_xxx
```

**B) Vercel environment variables** (for production):
https://vercel.com → Business Community App project → Settings → Environment Variables → add all three.

The legacy `RAZORPAY_PLAN_ID_MONTHLY` can stay for now (acts as fallback for any in-flight legacy subscriptions).

### Step 2 — Smoke test the flows

Either on local (`npm run dev`) with Razorpay test mode, or on a Vercel preview deploy.

- [ ] Sign up as a new user → `/plans` shows 3 tier cards → pick Library → Razorpay checkout → land on dashboard → confirm Library tier badge on `/profile`
- [ ] Sign up as another new user → pick Workshop → same flow → confirm Workshop tier badge
- [ ] As Workshop user, visit `/subscription` → click "Upgrade to AI Lab" → confirm pro-rate amount shown → pay → confirm AI Lab tier badge appears
- [ ] As AI Lab user, click "Downgrade to Library" → confirm warning modal → confirm → confirm amber banner appears showing scheduled effective date
- [ ] As Library user, visit `/events` → see workshops in list, RSVP disabled with upgrade nudge, AI Lab upsell card at bottom
- [ ] As Library user, manually navigate to any AI Lab event URL → see soft denial card with upgrade CTA, NOT a 404
- [ ] Admin: visit `/admin/events` → schedule a workshop → upload a replay URL → confirm visible to Workshop+ members immediately and to Library after 30 days

### Step 3 — Merge to main

Once Step 2 passes, on the PR page (https://github.com/offbeatculture/Business-Communnity/pull/4):

1. Mark PR as **Ready for review** (currently a draft)
2. Get approval, then **Squash and merge** (or regular merge — repo precedent uses regular merges)
3. Vercel auto-deploys main to https://business-communnity.vercel.app

Migrations are already applied to production Supabase — nothing extra to run on merge.

---

## Known TODOs (not blocking launch)

- **Razorpay mandate continuity on downgrade** — if a user's autopay mandate doesn't carry over to the new subscription after downgrade, they may need a re-authorization email. Webhook logs the failure for ops if it happens. Real test will tell us if this is an issue.
- **PostCard tier badge** — author tier not yet shown next to community post authors. Stubbed with TODO in `components/community/PostCard.tsx`.
- **Annual plans** — currently monthly-only across all three tiers. Open question per spec.

---

## Reference

- **PR:** https://github.com/offbeatculture/Business-Communnity/pull/4
- **Repo:** https://github.com/offbeatculture/Business-Communnity
- **Spec:** `Three-tier-implementation-plan.md` (in repo root)
- **Supabase project:** Business Community App (ref `uopolpjzmgewyfgvdyfk`, Tokyo region)
- **Identity required for commits/pushes:** `offbeatculture <tools.offbeatculture@gmail.com>` (Vercel deploy gate)
- **Shipped by:** Swastik + Claude Code (10 commits, ~9,000 lines added)
