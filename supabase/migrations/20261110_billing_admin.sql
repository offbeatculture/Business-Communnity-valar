-- =============================================================================
-- Billing admin: a local copy of the Razorpay data Lifinity needs, and a
-- record of what the webhook did with every event.
-- =============================================================================
-- Reconciling members against Razorpay meant pulling ~28,000 payments from the
-- API by hand, which takes minutes. These tables hold the Lifinity-relevant
-- slice of it so the admin Billing pages load in a second, refreshed by a
-- "Sync now" button that only fetches what is new.
--
-- What is kept: every plan and subscription (no personal data on either), and
-- only those payments that belong to a Lifinity plan or to someone who has a
-- Lifinity account. Other businesses' customers on the same Razorpay account
-- are not copied in.
--
-- Service role only: RLS on, no policies. Members can never read these.
-- Idempotent — safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Razorpay plans
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rzp_plans (
  id            text        PRIMARY KEY,
  name          text,
  amount        integer,            -- paise
  period        text,
  interval      integer,
  -- Lifinity's own plans, as opposed to EIC and other products on the same
  -- Razorpay account. Set by the sync from the plan name and the webhook
  -- allowlist.
  is_lifinity   boolean     NOT NULL DEFAULT false,
  created_at    timestamptz,
  synced_at     timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. Razorpay subscriptions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rzp_subscriptions (
  id                   text        PRIMARY KEY,
  plan_id              text,
  status               text,       -- created / authenticated / active / pending / halted / cancelled / completed / expired
  customer_id          text,
  -- From the subscription's invoices; only filled for Lifinity subscriptions.
  email                text,
  contact              text,       -- last 10 digits
  customer_name        text,
  paid_count           integer,
  total_count          integer,
  created_at           timestamptz,
  start_at             timestamptz,
  current_start        timestamptz,
  current_end          timestamptz, -- paid-up-to for an active subscription
  charge_at            timestamptz,
  ended_at             timestamptz,
  short_url            text,
  notes                jsonb,
  invoices_synced_at   timestamptz,
  synced_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rzp_subscriptions_plan_idx    ON rzp_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS rzp_subscriptions_status_idx  ON rzp_subscriptions (status);
CREATE INDEX IF NOT EXISTS rzp_subscriptions_email_idx   ON rzp_subscriptions (lower(email));
CREATE INDEX IF NOT EXISTS rzp_subscriptions_contact_idx ON rzp_subscriptions (contact);

-- -----------------------------------------------------------------------------
-- 3. Razorpay payments (Lifinity-relevant only)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rzp_payments (
  id               text        PRIMARY KEY,
  amount           integer,            -- paise
  amount_refunded  integer     NOT NULL DEFAULT 0,
  status           text,               -- captured / refunded / failed / authorized
  method           text,
  email            text,
  contact          text,               -- last 10 digits
  order_id         text,
  invoice_id       text,
  -- Only known for Lifinity subscription payments (via their invoices).
  subscription_id  text,
  description      text,
  notes            jsonb,
  created_at       timestamptz,
  -- Why the sync kept it: 'lifinity_invoice' or 'member_match'.
  kept_because     text,
  synced_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rzp_payments_email_idx   ON rzp_payments (lower(email));
CREATE INDEX IF NOT EXISTS rzp_payments_contact_idx ON rzp_payments (contact);
CREATE INDEX IF NOT EXISTS rzp_payments_sub_idx     ON rzp_payments (subscription_id);
CREATE INDEX IF NOT EXISTS rzp_payments_created_idx ON rzp_payments (created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. Sync progress
-- -----------------------------------------------------------------------------
-- A sync runs in short steps (serverless functions time out), so where it got
-- to is kept here between steps.
CREATE TABLE IF NOT EXISTS rzp_sync_state (
  key          text        PRIMARY KEY,
  state        jsonb       NOT NULL DEFAULT '{}',
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rzp_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rzp_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rzp_payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rzp_sync_state    ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5. What the webhook did with each event
-- -----------------------------------------------------------------------------
-- Ignored and rejected events used to return before anything was written, so
-- they left no trace — which is why renewals went unrecorded for weeks
-- without anyone seeing it. Every event now records its outcome and why.
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS outcome   text;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS plan_id   text;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS entity_id text;

COMMENT ON COLUMN webhook_events.outcome IS
  'processed / failed / ignored / rejected / duplicate. NULL = recorded before outcomes were tracked.';

CREATE INDEX IF NOT EXISTS webhook_events_created_idx ON webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_events_type_idx    ON webhook_events (event_type, created_at DESC);

COMMIT;
