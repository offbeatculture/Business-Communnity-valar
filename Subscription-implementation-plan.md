# Plan: Subscription-First Onboarding System

## Context

The current app has a **register → login → pay → access** flow using Supabase Auth (email/password) and Razorpay one-time payments. The user wants to invert this to a **Netflix-style** flow: **enter email → select plan → autopay checkout → webhook confirms → magic link email → set password → access**. This requires switching to Razorpay Subscriptions (recurring/autopay), adding Amazon SES for emails, implementing custom magic links, and redesigning the landing + auth pages.

The goal: users should NOT create an account before paying. Payment proves intent. Account creation happens server-side after webhook confirmation.

### Key Decisions
- **Pricing**: Flat ₹499/month only. No annual plan for now (will be added later).
- **Tiered pricing**: Removed. Single flat price = single Razorpay Plan.
- **Backward compatibility**: Old one-time payment flow stays working. Existing users keep their current login/renewal. New users go through the new subscription flow. Old API routes (`/api/razorpay/create-order`, `/api/razorpay/verify-payment`) are preserved.

---

## Architecture Decision: Supabase Auth + Custom Magic Links

We **keep Supabase Auth** as the identity provider (preserves existing middleware, RLS, sessions) but add a custom magic link layer on top:

1. Webhook creates user via `supabase.auth.admin.createUser()`
2. Auth trigger auto-creates profile (existing behavior)
3. Custom magic link token sent via SES
4. On magic link click: verify custom token → call `admin.generateLink({ type: 'magiclink' })` → redirect through existing `/auth/confirm` route → Supabase session created
5. User sets password via `supabase.auth.updateUser({ password })`
6. Future logins: standard email/password via `signInWithPassword()`

---

## New Dependencies

```
@aws-sdk/client-ses
```

(The existing `razorpay` SDK v2.9.6 already supports `razorpay.subscriptions.create()`)

---

## Database Migration: `supabase/migrations/008_onboarding_subscription_system.sql`

### New Tables

**`onboarding_sessions`** - tracks pre-auth payment funnel
- `id`, `email`, `plan_id`, `razorpay_subscription_id`, `status` (pending → payment_pending → paid → user_created → completed | expired | failed), `user_id`, `metadata` (JSONB), `expires_at`, timestamps
- Indexes on `email`, `razorpay_subscription_id`, `status`

**`magic_login_tokens`** - hashed single-use tokens
- `id`, `user_id`, `token_hash` (SHA-256), `expires_at` (20 min), `used_at`, `created_at`
- Index on `token_hash`

**`webhook_events`** - idempotency log
- `id`, `event_type`, `razorpay_event_id` (UNIQUE), `payload` (JSONB), `processed_at`, `error`, `created_at`

### Schema Modifications

**`subscriptions`** - changes:
- `ALTER COLUMN razorpay_payment_id DROP NOT NULL` (recurring subs won't have this at creation)
- Add `razorpay_subscription_id TEXT`
- Add `recurring_status TEXT` CHECK IN ('active', 'paused', 'cancelled', 'completed')
- Add `plan_label TEXT` (store plan name for invoice generation — subscription events don't carry order notes)
- Add `base_amount_paise INTEGER` (store base amount for invoice generation)
- Add `UNIQUE` constraint on `razorpay_payment_id` (prevent race condition duplicates for one-time payments)
- Add partial unique index: `CREATE UNIQUE INDEX idx_one_active_sub_per_user ON subscriptions(user_id) WHERE status = 'active'` (prevent duplicate active subscriptions per user)

**`profiles`** - add column:
- `password_set BOOLEAN DEFAULT NULL` (NOT `DEFAULT false` — see Breakage Prevention below)
- Then: `UPDATE profiles SET password_set = true WHERE password_set IS NULL` (backfill existing users)

### Auth Trigger Update
Update `handle_new_user()` to set `password_set` from user metadata:
```sql
password_set = COALESCE((NEW.raw_user_meta_data->>'password_set')::boolean, true)
```
Note: defaults to `true` for normal signups (existing flow). Only webhook-created users pass `password_set: false` in metadata.

### RLS
All three new tables: RLS enabled, no user-level policies (accessed only via service role in API routes).

---

## Breakage Prevention (Critical)

### Issue 1: `password_set` must NOT lock out existing users
- Use `DEFAULT NULL`, not `DEFAULT false`
- Backfill all existing rows to `true` immediately after adding column
- Middleware checks `password_set === false` (strict), not falsy — so `NULL` and `true` both pass

### Issue 2: Webhook must handle BOTH old and new event types
- Do NOT delete `payment.captured` handling — existing one-time payments still emit this event
- The rewritten webhook handles both:
  - `payment.captured` → old one-time payment backup flow (keep existing logic)
  - `subscription.activated/charged/cancelled/completed` → new recurring flow
- This preserves backward compatibility for existing users renewing via old flow

### Issue 3: `razorpay_payment_id` NOT NULL blocks recurring subscriptions
- Must `ALTER COLUMN razorpay_payment_id DROP NOT NULL`
- Recurring subscription records will have `razorpay_subscription_id` instead
- Old one-time records keep `razorpay_payment_id` as before

### Issue 4: Invoice generation needs plan metadata from subscriptions table
- `generateInvoice()` currently reads `planLabel` and `basePaise` from Razorpay order notes
- Subscription events don't have order notes
- Fix: store `plan_label` and `base_amount_paise` in `subscriptions` table
- Webhook reads plan config and stores it when creating subscription record
- `generateInvoice()` can then read from the subscription record

### Issue 5: PaymentHistory assumes 1 invoice per subscription
- Recurring subscriptions generate multiple invoices (one per charge)
- Update `PaymentHistory.tsx`: query invoices by `user_id` ordered by date, not mapped 1:1 to subscription
- Each `subscription.charged` webhook event generates a new invoice linked to the same subscription

### Issue 6: Subscription status logic in `lib/profile.ts` must handle recurring
- Current logic: `status = expires_at > now ? "active" : "expired"`
- Must also check: if `recurring_status = 'cancelled'` AND `expires_at > now`, show as "active (cancelling)" or still grant access until expiry
- Middleware subscription query must exclude truly cancelled subs: add `.or('recurring_status.is.null,recurring_status.in.(active,paused)')` filter

### Issue 8: Duplicate subscriptions — user pays twice with same email
- Nothing prevents a user from starting the onboarding flow twice and ending up with two Razorpay subscriptions + two DB records
- Fix in `/api/onboarding/start`: check if email already has an active subscription → return error "Already a member"
- Fix in `/api/onboarding/create-subscription`: check if session already has a `razorpay_subscription_id` → don't create another
- Fix in webhook `subscription.activated`: check if user already has an active subscription record → skip creation, log warning
- Add partial unique index: `CREATE UNIQUE INDEX idx_one_active_sub_per_user ON subscriptions(user_id) WHERE status = 'active'`

### Issue 9: Race condition between verify-payment and webhook
- Both routes check "does subscription exist?" then INSERT — gap between check and insert allows duplicates
- Fix: add `UNIQUE` constraint on `razorpay_payment_id` (for one-time payments) in migration
- Use `INSERT ... ON CONFLICT (razorpay_payment_id) DO NOTHING` in both routes
- For recurring subscriptions, use `razorpay_subscription_id` + unique constraint similarly

### Issue 10: Onboarding session cleanup
- Sessions expire after 2 hours but stale rows accumulate forever
- Fix: in `/api/onboarding/start`, before creating a new session, delete expired sessions for the same email: `DELETE FROM onboarding_sessions WHERE email = $1 AND expires_at < NOW()`
- This is lightweight cleanup that runs on every new onboarding attempt — no cron needed

### Issue 7: Type definitions must be updated carefully
- `Subscription.razorpay_payment_id` → make optional (`string | null`)
- Add `razorpay_subscription_id?: string | null`
- Add `recurring_status?: 'active' | 'paused' | 'cancelled' | 'completed' | null`
- Add `plan_label?: string | null`
- Add `base_amount_paise?: number | null`
- `Profile` → add `password_set?: boolean | null`

---

## New Library Files

### `lib/ses.ts` - Amazon SES Email Utility
- `sendEmail({ to, subject, html, text })` - core sender
- `sendMagicLinkEmail({ to, token, name })` - magic link template (subscription active, click to access, expires in 20 min)
- `sendPaymentConfirmationEmail({ to, name, planLabel, amount })` - receipt email

### `lib/magic-link.ts` - Token System
- `generateMagicToken()` → `{ raw, hash }` using `crypto.randomBytes(32)` + SHA-256
- `createMagicLoginToken(userId)` - invalidates old tokens, stores hash, returns raw token
- `verifyMagicToken(rawToken)` - hash → lookup → check expiry → check used_at → mark used → return user_id

### `lib/razorpay-subscriptions.ts` - Subscriptions API Wrapper
- `createSubscription({ email, sessionId })` - calls `razorpay.subscriptions.create()` with the single monthly plan (`RAZORPAY_PLAN_ID_MONTHLY`)
- `cancelSubscription(subscriptionId)`
- `fetchSubscription(subscriptionId)`
- Uses existing `razorpay` instance from `lib/razorpay.ts`
- No tier logic needed — flat ₹499/mo with one Razorpay Plan

### `lib/rate-limit.ts` - In-Memory Rate Limiter
- `rateLimit({ key, limit, windowMs })` → `{ allowed, remaining }`
- Applied to: onboarding/start (5/15min), magic-link/resend (3/10min)

---

## New API Routes (7 routes)

### Onboarding Flow

**`POST /api/onboarding/start`**
- Input: `{ email }` → validate → rate limit
- Check if email already has active subscription → error if so
- Create `onboarding_sessions` row (status: `pending`, 2hr expiry)
- Return `{ sessionId }`

**`POST /api/onboarding/create-subscription`**
- Input: `{ sessionId }`
- Validate session exists, not expired
- Create Razorpay Subscription via SDK using `RAZORPAY_PLAN_ID_MONTHLY` (flat ₹499/mo)
- Update session: `razorpay_subscription_id`, status → `payment_pending`
- Return `{ subscriptionId, keyId }`

**`POST /api/onboarding/verify`**
- Input: `{ razorpay_payment_id, razorpay_subscription_id, razorpay_signature }`
- Verify HMAC signature (`payment_id|subscription_id` signed with key_secret)
- Update session status → `paid`
- Return success message ("Check your email for login link")
- Note: actual user creation happens in webhook, NOT here

### Auth Flow

**`GET /app/auth/magic/route.ts`** (magic link landing)
- Input: `?token=xxx`
- Verify custom token via `verifyMagicToken()`
- If valid: call `admin.generateLink({ type: 'magiclink', email })` → get `hashed_token`
- Redirect to `/auth/confirm?token_hash={hashed_token}&type=magiclink&next=/set-password`
- Existing `/auth/confirm` creates Supabase session and redirects to `/set-password`

**`POST /api/auth/magic-link/resend`**
- Input: `{ email }` → rate limit
- Look up user, verify `password_set = false`
- Create new magic token, invalidate old ones
- Send via SES

**`POST /api/auth/set-password`**
- Requires active Supabase session
- Input: `{ password }` (min 8 chars, validated)
- `supabase.auth.updateUser({ password })`
- Update `profiles.password_set = true`
- Return success

---

## Webhook Update: `app/api/webhooks/razorpay/route.ts`

**NOT a complete rewrite** — must handle both old and new event types for backward compatibility.

### Old events (preserved for existing one-time payment flow):

| Event | Action |
|-------|--------|
| `payment.captured` | Existing logic: find user, create subscription record, generate invoice (KEEP AS-IS) |

### New events (added for recurring subscription flow):

| Event | Action |
|-------|--------|
| `subscription.activated` | Find onboarding session → create Supabase user via admin API → create subscription record (with `plan_label`, `base_amount_paise` from config) → generate magic link → send via SES → generate invoice |
| `subscription.charged` | Find user by `razorpay_subscription_id` → extend `expires_at` by one billing period → generate new invoice |
| `subscription.cancelled` | Update `recurring_status` → `cancelled` (user keeps access until `expires_at`) |
| `subscription.completed` | Update `recurring_status` → `completed` |

All events: signature verification + idempotency check via `webhook_events` table.

The `subscription.activated` event is the **core orchestrator** — it's the single place where new user accounts get created.

---

## New Frontend Pages (4 pages)

### `app/(public)/plans/page.tsx` - Plan Selection
- Receives `?session={sessionId}` from landing page
- Shows 499/mo plan card with "Autopay enabled / Cancel anytime"
- "Continue" → calls `/api/onboarding/create-subscription` → opens Razorpay checkout modal
- Razorpay checkout uses `subscription_id` (not `order_id`)
- On success → calls `/api/onboarding/verify` → navigates to `/payment-success`

### `app/(public)/payment-success/page.tsx` - Post-Payment
- "Payment successful! We've sent a login link to {email}"
- "Resend login link" button
- "Already have an account? Log in" link

### `app/(public)/set-password/page.tsx` - First-Time Password Setup
- Requires Supabase session (user just came through magic link)
- New password + confirm password fields
- Submit → `POST /api/auth/set-password`
- On success → redirect to `/setup` (existing profile setup) or `/dashboard`

### `app/auth/magic/route.ts` - Magic Link Handler
- Server route (GET), not a page
- Bridges custom magic token → Supabase session (as described above)

---

## Modified Files (12 files)

### `middleware.ts`
- Add to public routes: `/plans`, `/payment-success`, `/set-password`
- Add `password_set` check: if logged in but `password_set === false` (strict equality, NOT falsy — `NULL` passes) and not on `/set-password` → redirect to `/set-password`
- Combine with existing profile query: `select("business_name, password_set, role")`
- Update subscription query: add `.or('recurring_status.is.null,recurring_status.in.(active,paused)')` to exclude cancelled recurring subs

### `lib/razorpay-checkout.ts`
- Add `openRazorpaySubscriptionCheckout({ subscriptionId, email, name })` function
- Passes `subscription_id` instead of `order_id` to Razorpay options

### `components/landing/Hero.tsx`
- Redesign: Netflix-style dark hero with email input + "Get Started" CTA
- On submit: calls `/api/onboarding/start` → redirects to `/plans?session={id}`

### `components/landing/PricingSection.tsx`
- Update CTAs to feed into onboarding flow (capture email if not captured)

### `app/(public)/login/page.tsx`
- Add "Don't have an account? Get Started" link to landing page
- Keep existing email/password login as-is

### `app/(protected)/subscription/page.tsx`
- Show recurring subscription details (next billing, status)
- Add "Cancel Subscription" option

### `types/index.ts`
- Add: `OnboardingSession`, `MagicLoginToken`, `WebhookEvent` types
- Update `Subscription` type with new fields

### `app/page.tsx`
- Minor: may need to pass session handling to Hero component

### `lib/profile.ts` (breakage fix)
- Update `fetchProfile()` subscription status logic to check `recurring_status` in addition to `expires_at`
- A cancelled recurring sub with future `expires_at` should show "active" (access until period ends) but indicate cancellation
- Update `fetchAllMembers()` and `fetchAdminStats()` to handle recurring subscription semantics

### `components/subscription/PaymentHistory.tsx` (breakage fix)
- Change from 1:1 invoice-to-subscription mapping to querying all invoices by user, ordered by date
- Recurring subscriptions will have multiple invoices (one per charge cycle)

### `components/subscription/CurrentPlanCard.tsx` (breakage fix)
- Show recurring subscription info: next billing date, recurring status, cancel option
- Handle both one-time and recurring subscription display

### `lib/invoice.ts` (breakage fix)
- Update `generateInvoice()` to accept plan metadata from subscriptions table (not just from Razorpay order notes)
- Add fallback: if `planLabel`/`basePaise` not passed, read from subscription record's `plan_label`/`base_amount_paise` columns

---

## Environment Variables (new)

```env
# Amazon SES
AWS_SES_REGION=ap-south-1
AWS_SES_ACCESS_KEY_ID=xxx
AWS_SES_SECRET_ACCESS_KEY=xxx
SES_FROM_EMAIL=hello@superhumanentrepreneur.com

# Razorpay Subscriptions
RAZORPAY_PLAN_ID_MONTHLY=plan_xxx

# App URL (for magic links)
NEXT_PUBLIC_APP_URL=https://app.superhumanentrepreneur.com
```

---

## Implementation Order

### Sprint 1: Foundation
1. Migration `008_onboarding_subscription_system.sql`
2. Install `@aws-sdk/client-ses`
3. `lib/ses.ts`
4. `lib/magic-link.ts`
5. `lib/razorpay-subscriptions.ts`
6. `lib/rate-limit.ts`
7. Update `types/index.ts`

### Sprint 2: Backend APIs
1. `POST /api/onboarding/start`
2. `POST /api/onboarding/create-subscription`
3. `POST /api/onboarding/verify`
4. Rewrite `POST /api/webhooks/razorpay` (subscription events)
5. `GET /app/auth/magic`
6. `POST /api/auth/magic-link/resend`
7. `POST /api/auth/set-password`

### Sprint 3: Frontend
1. Update `lib/razorpay-checkout.ts` (subscription checkout)
2. Rewrite `components/landing/Hero.tsx` (email capture)
3. Create `app/(public)/plans/page.tsx`
4. Create `app/(public)/payment-success/page.tsx`
5. Create `app/(public)/set-password/page.tsx`
6. Update `app/(public)/login/page.tsx`

### Sprint 4: Integration
1. Update `middleware.ts` (new routes + password_set check)
2. Update `components/landing/PricingSection.tsx`
3. Update `app/(protected)/subscription/page.tsx`
4. Handle all UX states (loading, errors, expired token, etc.)

---

## Verification Plan

1. **Razorpay test mode**: Create test subscription, verify checkout modal works with `subscription_id`
2. **Webhook**: Use Razorpay dashboard to send test webhook → verify user creation, magic link email sent
3. **Magic link flow**: Click link → verify Supabase session created → redirected to `/set-password`
4. **Set password**: Set password → verify `password_set = true` in DB → redirected to `/setup` or `/dashboard`
5. **Standard login**: Log out → log in with email/password → verify access
6. **Middleware**: Verify all route protections work (no password → `/set-password`, no profile → `/setup`, no subscription → `/renew`)
7. **Idempotency**: Send same webhook twice → verify no duplicate users/subscriptions
8. **Rate limits**: Hit onboarding/start and resend endpoints beyond limits → verify 429 responses
9. **Existing users**: Verify users with old one-time payments still work (backward compatibility)

---

## Razorpay Dashboard Configuration

1. Create a **Plan** (API or dashboard): ₹499/month, monthly interval
2. Note the `plan_id` → set as `RAZORPAY_PLAN_ID_MONTHLY`
3. Create **Webhook**: URL = `https://{domain}/api/webhooks/razorpay`, events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`
4. Note webhook secret → set as `RAZORPAY_WEBHOOK_SECRET`

## Amazon SES Configuration

1. Verify sender domain or email in SES console
2. Request production access (move out of sandbox) if needed
3. Create IAM credentials with `ses:SendEmail` permission
4. Set env vars: region, access key, secret key, from email
