-- =============================================================================
-- Migration: 20260510_three_tier_system.sql
-- Purpose:   Phase 1 of the three-tier subscription system.
--            Adds tier columns to `subscriptions`, creates the `tier_changes`
--            audit table, adds the `current_user_tier_rank()` RLS helper
--            function, and backfills all existing subscription rows.
--
-- Related spec: Three-tier-implementation-plan.md (spec locked 2026-05-10)
--
-- Reversibility:
--   To roll back this migration:
--     DROP TABLE IF EXISTS tier_changes;
--     ALTER TABLE subscriptions
--       DROP COLUMN IF EXISTS tier,
--       DROP COLUMN IF EXISTS tier_rank,
--       DROP COLUMN IF EXISTS locked_price_paise,
--       DROP COLUMN IF EXISTS band_at_signup,
--       DROP COLUMN IF EXISTS razorpay_plan_id,
--       DROP COLUMN IF EXISTS pending_downgrade_to,
--       DROP COLUMN IF EXISTS pending_downgrade_effective_at;
--     DROP INDEX IF EXISTS idx_subscriptions_user_tier_rank_active;
--     DROP FUNCTION IF EXISTS current_user_tier_rank();
--
-- DO NOT DELETE subscription rows. invoices.subscription_id references
-- subscriptions(id) ON DELETE CASCADE — deletion would cascade-wipe invoice
-- history. Always UPDATE status = 'cancelled' instead.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. COMMENT on subscriptions table
-- =============================================================================
--    Warn future engineers about the CASCADE risk on invoices.
-- =============================================================================

COMMENT ON TABLE subscriptions IS
  'WARNING: invoices.subscription_id has ON DELETE CASCADE referencing this table. '
  'Never DELETE rows from subscriptions — only UPDATE status to ''cancelled''. '
  'Deleting a subscription row will silently cascade-delete all associated invoice records.';


-- =============================================================================
-- 2. ADD COLUMNS TO subscriptions
-- =============================================================================

-- tier: which product the member has access to.
-- Values: 'library' (T1), 'workshop' (T2), 'ai_lab' (T3).
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'library';

-- Add CHECK constraint separately so it is idempotent (constraint names are
-- unique within a table; IF NOT EXISTS is not available for constraints, so
-- we guard with a DO block).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'subscriptions_tier_check'
      AND  conrelid = 'subscriptions'::regclass
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_tier_check
      CHECK (tier IN ('library', 'workshop', 'ai_lab'));
  END IF;
END;
$$;

-- tier_rank: denormalised integer for fast middleware / RLS comparisons.
-- Library = 1, Workshop = 2, AI Lab = 3.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS tier_rank int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'subscriptions_tier_rank_check'
      AND  conrelid = 'subscriptions'::regclass
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_tier_rank_check
      CHECK (tier_rank BETWEEN 1 AND 3);
  END IF;
END;
$$;

-- locked_price_paise: price at signup, preserved for life (founding price lock
-- per decision D4). Default 0 for the column addition; backfilled below.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS locked_price_paise int NOT NULL DEFAULT 0;

-- band_at_signup: which milestone band the member joined in.
-- Nullable on column add; backfilled below for all existing rows.
-- Values: 'founding' | 'growth' | 'scaled' | 'mature' | 'cap'
-- ('cap' reserved for future bands; no existing members land here.)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS band_at_signup text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'subscriptions_band_at_signup_check'
      AND  conrelid = 'subscriptions'::regclass
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_band_at_signup_check
      CHECK (band_at_signup IN ('founding', 'growth', 'scaled', 'mature', 'cap'));
  END IF;
END;
$$;

-- razorpay_plan_id: the Razorpay plan the member is subscribed to.
-- Nullable — backfilled in Phase 2 once env vars are wired.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_plan_id text;

-- pending_downgrade_to: target tier for an end-of-period downgrade (D2).
-- Null means no pending downgrade.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pending_downgrade_to text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'subscriptions_pending_downgrade_to_check'
      AND  conrelid = 'subscriptions'::regclass
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_pending_downgrade_to_check
      CHECK (pending_downgrade_to IN ('library', 'workshop', 'ai_lab') OR pending_downgrade_to IS NULL);
  END IF;
END;
$$;

-- pending_downgrade_effective_at: when the pending downgrade fires.
-- Must be non-null whenever pending_downgrade_to is set; enforced in app layer.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pending_downgrade_effective_at timestamptz;


-- =============================================================================
-- 3. INDEX on subscriptions for current_user_tier_rank()
-- =============================================================================
--    Partial index: only active subscriptions matter for access checks.
--    (user_id, tier_rank) composite so the function can satisfy the query
--    with an index-only scan.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_tier_rank_active
  ON subscriptions (user_id, tier_rank)
  WHERE status = 'active';


-- =============================================================================
-- 4. CREATE tier_changes TABLE
-- =============================================================================
--    Audit trail for upgrades and downgrades. Also used by the D5 frequency
--    check (one tier change per billing period).
--
--    subscription_id uses ON DELETE SET NULL so the audit row survives if a
--    subscription is ever cleaned up (the user_id reference is the durable key).
-- =============================================================================

CREATE TABLE IF NOT EXISTS tier_changes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL
                                  REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id     uuid
                                  REFERENCES subscriptions(id) ON DELETE SET NULL,
  from_tier           text        NOT NULL
                                  CHECK (from_tier IN ('library', 'workshop', 'ai_lab')),
  to_tier             text        NOT NULL
                                  CHECK (to_tier IN ('library', 'workshop', 'ai_lab')),
  change_type         text        NOT NULL
                                  CHECK (change_type IN ('upgrade', 'downgrade', 'reactivation')),
  requested_at        timestamptz NOT NULL DEFAULT now(),
  effective_at        timestamptz NOT NULL,
                                  -- Immediate for upgrades (D1), end-of-period for downgrades (D2)
  pro_rated_paise     int,        -- Pro-rated charge for upgrades (D1); NULL for downgrades
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- D5 frequency check: "has this user changed tier in the current billing period?"
-- Query pattern: WHERE user_id = $1 AND requested_at >= $billing_period_start
CREATE INDEX IF NOT EXISTS idx_tier_changes_user_requested
  ON tier_changes (user_id, requested_at DESC);

-- Downgrade processor: "find all pending downgrades that are now effective"
-- Query pattern: WHERE effective_at <= now() (joined with subscriptions for pending rows)
CREATE INDEX IF NOT EXISTS idx_tier_changes_effective_at
  ON tier_changes (effective_at);


-- =============================================================================
-- 5. RLS on tier_changes
-- =============================================================================
--    Members can read their own rows (for UI display).
--    Members cannot write directly — all writes go through the service role
--    via API routes and webhooks.
--    Service role bypasses RLS automatically (no explicit policy needed).
-- =============================================================================

ALTER TABLE tier_changes ENABLE ROW LEVEL SECURITY;

-- Drop and recreate the SELECT policy idempotently.
DO $$
BEGIN
  -- Remove old policy if it exists so this block is re-runnable.
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tier_changes' AND policyname = 'tier_changes_select_own'
  ) THEN
    DROP POLICY tier_changes_select_own ON tier_changes;
  END IF;
END;
$$;

CREATE POLICY tier_changes_select_own
  ON tier_changes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Explicitly deny INSERT / UPDATE / DELETE for non-service-role callers.
-- (When RLS is enabled and no permissive INSERT policy exists, inserts are
-- already blocked for authenticated users. These policies make the intent
-- explicit and survive future policy audits.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tier_changes' AND policyname = 'tier_changes_no_insert'
  ) THEN
    DROP POLICY tier_changes_no_insert ON tier_changes;
  END IF;
END;
$$;

CREATE POLICY tier_changes_no_insert
  ON tier_changes
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tier_changes' AND policyname = 'tier_changes_no_update'
  ) THEN
    DROP POLICY tier_changes_no_update ON tier_changes;
  END IF;
END;
$$;

CREATE POLICY tier_changes_no_update
  ON tier_changes
  FOR UPDATE
  TO authenticated
  USING (false);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tier_changes' AND policyname = 'tier_changes_no_delete'
  ) THEN
    DROP POLICY tier_changes_no_delete ON tier_changes;
  END IF;
END;
$$;

CREATE POLICY tier_changes_no_delete
  ON tier_changes
  FOR DELETE
  TO authenticated
  USING (false);


-- =============================================================================
-- 6. CREATE FUNCTION current_user_tier_rank()
-- =============================================================================
--    Returns the highest tier_rank among active subscriptions for auth.uid().
--    Returns 0 if the user has no active subscription.
--
--    SECURITY DEFINER: runs with the privileges of the function owner (postgres)
--    so it can bypass RLS when reading subscriptions internally.
--    STABLE: result is constant within a single SQL statement; allows the
--    planner to call it once per query rather than once per row.
--
--    Used in RLS policies on workshop, AI Lab, and replay tables (Phases 3–4).
--    Call pattern: current_user_tier_rank() >= 2  (Workshop+)
--                  current_user_tier_rank() >= 3  (AI Lab only)
-- =============================================================================

CREATE OR REPLACE FUNCTION current_user_tier_rank()
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rank int;
BEGIN
  SELECT COALESCE(MAX(tier_rank), 0)
  INTO   v_rank
  FROM   subscriptions
  WHERE  user_id = (SELECT auth.uid())
    AND  status  = 'active';

  RETURN v_rank;
END;
$$;

COMMENT ON FUNCTION current_user_tier_rank() IS
  'Returns the highest tier_rank (1=Library, 2=Workshop, 3=AI Lab) among active '
  'subscriptions for the currently authenticated user. Returns 0 for unauthenticated '
  'callers or users with no active subscription. Used in RLS policies. '
  'SECURITY DEFINER — do not grant EXECUTE to untrusted roles without review.';


-- =============================================================================
-- 7. BACKFILL EXISTING subscriptions ROWS
-- =============================================================================
--    All existing members are Library tier at their original price.
--
--    locked_price_paise:
--      COALESCE(base_amount_paise, ROUND(amount_paid / 1.18))
--      base_amount_paise is the pre-GST base stored by the onboarding system.
--      For legacy rows where it is NULL, back-calculate from amount_paid
--      (which is the GST-inclusive total) by dividing by 1.18.
--      amount_paid is stored in paise, so no unit conversion needed.
--
--    band_at_signup mapping (OLD band definitions from lib/plans.ts):
--      49,900 paise  = founding monthly  → 'founding'
--      79,900 paise  = early monthly     → 'growth'   (old "early" → new naming)
--      99,900 paise  = growth monthly    → 'scaled'   (old "growth" → new naming)
--     149,900 paise  = premium monthly   → 'mature'   (old "premium" → new naming)
--      Any other value (annual plans: 499900, 799900, 999900, 1499900; edge
--      cases) → 'founding' as the most generous fallback so no existing member
--      loses status due to a price they legitimately paid.
-- =============================================================================

UPDATE subscriptions
SET
  -- Tier fields: all existing members become Library
  tier                           = 'library',
  tier_rank                      = 1,

  -- Price lock: prefer stored base_amount_paise; fall back to backing out GST
  locked_price_paise             = COALESCE(
                                     base_amount_paise,
                                     ROUND(amount_paid / 1.18)::int
                                   ),

  -- Band at signup: derived from locked_price_paise using OLD band definitions
  band_at_signup                 = CASE
                                     WHEN COALESCE(base_amount_paise, ROUND(amount_paid / 1.18)::int) = 49900  THEN 'founding'
                                     WHEN COALESCE(base_amount_paise, ROUND(amount_paid / 1.18)::int) = 79900  THEN 'growth'
                                     WHEN COALESCE(base_amount_paise, ROUND(amount_paid / 1.18)::int) = 99900  THEN 'scaled'
                                     WHEN COALESCE(base_amount_paise, ROUND(amount_paid / 1.18)::int) = 149900 THEN 'mature'
                                     ELSE 'founding'  -- annual plans and edge cases
                                   END,

  -- razorpay_plan_id: left NULL; wired in Phase 2 application code
  razorpay_plan_id               = NULL,

  -- No pending downgrades for existing members
  pending_downgrade_to           = NULL,
  pending_downgrade_effective_at = NULL;


COMMIT;
