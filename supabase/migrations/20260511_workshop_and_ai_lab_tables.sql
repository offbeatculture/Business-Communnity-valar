-- =============================================================================
-- Migration: 20260510_workshop_and_ai_lab_tables.sql
-- Purpose:   Phase 4 of the three-tier subscription system.
--            Creates the live_events, live_event_replays, live_event_rsvps,
--            and hot_seat_applications tables, along with all trigger functions
--            and RLS policies that enforce the tier access matrix.
--
-- Related spec: Three-tier-implementation-plan.md (spec locked 2026-05-10)
-- Depends on:  20260510_three_tier_system.sql — must be applied first.
--              Specifically uses current_user_tier_rank() defined there.
--
-- Reversibility (apply in this exact order to roll back):
--   DROP TABLE IF EXISTS hot_seat_applications;
--   DROP TABLE IF EXISTS live_event_rsvps;
--   DROP TABLE IF EXISTS live_event_replays;
--   DROP TABLE IF EXISTS live_events;
--   DROP FUNCTION IF EXISTS trg_hot_seat_workshop_only();
--   DROP FUNCTION IF EXISTS trg_replay_event_type_match();
--   DROP FUNCTION IF EXISTS trg_live_event_min_tier_rank();
--   DROP FUNCTION IF EXISTS trg_set_updated_at();
--   DROP FUNCTION IF EXISTS is_admin();
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. HELPER: is_admin()
-- =============================================================================
-- The existing codebase uses profiles.role = 'admin' (see 001_initial_schema.sql
-- and 002_rls_policies.sql). No standalone is_admin() function was previously
-- defined — we create it here and reuse it across all policies in this file.
--
-- SECURITY DEFINER so it can read profiles without RLS interference.
-- Wrapped in (SELECT auth.uid()) so the planner evaluates it once per query,
-- not once per row (same pattern as current_user_tier_rank()).
-- =============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   profiles
    WHERE  user_id = (SELECT auth.uid())
      AND  role    = 'admin'
  );
$$;

COMMENT ON FUNCTION is_admin() IS
  'Returns true if the currently authenticated user has role = ''admin'' in profiles. '
  'Used in RLS policies. SECURITY DEFINER — do not grant EXECUTE to untrusted roles.';


-- =============================================================================
-- 2. SHARED TRIGGER FUNCTION: updated_at auto-bump
-- =============================================================================
-- Standard pattern used throughout the codebase. OR REPLACE makes it idempotent.
-- =============================================================================

CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- 3. TABLE: live_events
-- =============================================================================
-- Unified table for Workshop events (event_type = 'workshop') and AI Lab events
-- (event_type = 'ai_lab'). Discriminated by event_type.
--
-- min_tier_rank is denormalised: workshop → 2 (Workshop tier minimum for live
-- attendance), ai_lab → 3 (AI Lab only). A BEFORE INSERT trigger sets it from
-- event_type when not explicitly provided, but allows an explicit override so
-- admins can run a one-off workshop open to Library members if needed.
-- =============================================================================

CREATE TABLE IF NOT EXISTS live_events (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       text        NOT NULL
                               CHECK (event_type IN ('workshop', 'ai_lab')),
  title            text        NOT NULL,
  description      text,
  starts_at        timestamptz NOT NULL,
  duration_minutes int         NOT NULL DEFAULT 90
                               CHECK (duration_minutes > 0),
  meeting_url      text,                               -- nullable until close to event
  status           text        NOT NULL DEFAULT 'scheduled'
                               CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  min_tier_rank    int         NOT NULL DEFAULT 2,     -- overwritten by trigger if not set
  hot_seat_slots   int         NOT NULL DEFAULT 0,     -- 3 for workshops, 0 for ai_lab
  created_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_events_type_starts
  ON live_events (event_type, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_events_status_starts
  ON live_events (status, starts_at);

CREATE INDEX IF NOT EXISTS idx_live_events_min_tier_rank
  ON live_events (min_tier_rank);

-- Trigger: set min_tier_rank and hot_seat_slots from event_type when not
-- explicitly provided (i.e., when row is still using the column DEFAULT).
-- "Not explicitly provided" is approximated by checking whether the caller
-- left min_tier_rank at the column default (2). If event_type is 'ai_lab' and
-- min_tier_rank is still 2, we bump it to 3. workshop → 2 is already correct.
-- hot_seat_slots follows the same logic: workshop default is 3, ai_lab stays 0.

CREATE OR REPLACE FUNCTION trg_live_event_min_tier_rank()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only auto-set when the caller did not override the column defaults.
  -- Column defaults: min_tier_rank = 2, hot_seat_slots = 0.
  IF NEW.event_type = 'ai_lab' THEN
    -- ai_lab always requires tier_rank 3; force it.
    NEW.min_tier_rank  := 3;
    NEW.hot_seat_slots := 0;
  ELSIF NEW.event_type = 'workshop' THEN
    -- workshop minimum is tier_rank 2 (Workshop tier for live attendance).
    -- Respect an explicit admin override (e.g., open workshop to Library).
    IF NEW.min_tier_rank < 1 OR NEW.min_tier_rank > 3 THEN
      NEW.min_tier_rank := 2;
    END IF;
    -- hot_seat_slots default for new workshops is 3; only set if still at 0.
    IF NEW.hot_seat_slots = 0 THEN
      NEW.hot_seat_slots := 3;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_live_event_defaults'
      AND tgrelid = 'live_events'::regclass
  ) THEN
    CREATE TRIGGER set_live_event_defaults
      BEFORE INSERT ON live_events
      FOR EACH ROW EXECUTE FUNCTION trg_live_event_min_tier_rank();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'bump_live_events_updated_at'
      AND tgrelid = 'live_events'::regclass
  ) THEN
    CREATE TRIGGER bump_live_events_updated_at
      BEFORE UPDATE ON live_events
      FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
  END IF;
END;
$$;


-- =============================================================================
-- 4. TABLE: live_event_replays
-- =============================================================================
-- Stores replay recordings after an event completes.
--
-- event_type is DENORMALISED from the parent live_events row so that RLS
-- policies can filter by event_type without joining live_events on every row
-- check (a join inside a policy USING clause runs per-row — expensive at scale).
--
-- A BEFORE INSERT trigger enforces that the denormalised event_type matches the
-- parent live_events.event_type, preventing data inconsistency.
-- =============================================================================

CREATE TABLE IF NOT EXISTS live_event_replays (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid        NOT NULL
                               REFERENCES live_events(id) ON DELETE CASCADE,
  event_type       text        NOT NULL
                               CHECK (event_type IN ('workshop', 'ai_lab')),
  replay_url       text        NOT NULL,
  duration_seconds int,
  transcript_url   text,
  published_at     timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_event_replays_event_id
  ON live_event_replays (event_id);

CREATE INDEX IF NOT EXISTS idx_live_event_replays_type_published
  ON live_event_replays (event_type, published_at DESC);

-- Trigger: enforce that denormalised event_type matches the parent event.
CREATE OR REPLACE FUNCTION trg_replay_event_type_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_type text;
BEGIN
  SELECT event_type
  INTO   v_parent_type
  FROM   live_events
  WHERE  id = NEW.event_id;

  IF v_parent_type IS NULL THEN
    RAISE EXCEPTION 'live_event_replays: parent event_id % not found', NEW.event_id;
  END IF;

  IF NEW.event_type <> v_parent_type THEN
    RAISE EXCEPTION
      'live_event_replays: event_type (%) must match parent live_events.event_type (%) for event_id %',
      NEW.event_type, v_parent_type, NEW.event_id;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'enforce_replay_event_type'
      AND tgrelid = 'live_event_replays'::regclass
  ) THEN
    CREATE TRIGGER enforce_replay_event_type
      BEFORE INSERT OR UPDATE ON live_event_replays
      FOR EACH ROW EXECUTE FUNCTION trg_replay_event_type_match();
  END IF;
END;
$$;


-- =============================================================================
-- 5. TABLE: live_event_rsvps
-- =============================================================================

CREATE TABLE IF NOT EXISTS live_event_rsvps (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid        NOT NULL
                           REFERENCES live_events(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL
                           REFERENCES auth.users(id) ON DELETE CASCADE,
  rsvp_status  text        NOT NULL
                           CHECK (rsvp_status IN ('yes', 'maybe', 'no')),
  attended     boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Indexes (event_id is covered by the unique index; add user_id and composite)
CREATE INDEX IF NOT EXISTS idx_live_event_rsvps_user_id
  ON live_event_rsvps (user_id);

CREATE INDEX IF NOT EXISTS idx_live_event_rsvps_event_status
  ON live_event_rsvps (event_id, rsvp_status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'bump_live_event_rsvps_updated_at'
      AND tgrelid = 'live_event_rsvps'::regclass
  ) THEN
    CREATE TRIGGER bump_live_event_rsvps_updated_at
      BEFORE UPDATE ON live_event_rsvps
      FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
  END IF;
END;
$$;


-- =============================================================================
-- 6. TABLE: hot_seat_applications
-- =============================================================================
-- Workshop-only. A trigger (below) raises an exception if event_id references
-- an ai_lab event — CHECK constraints cannot use subqueries in PostgreSQL.
-- =============================================================================

CREATE TABLE IF NOT EXISTS hot_seat_applications (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           uuid        NOT NULL
                                 REFERENCES live_events(id) ON DELETE CASCADE,
  user_id            uuid        NOT NULL
                                 REFERENCES auth.users(id) ON DELETE CASCADE,
  application_text   text        NOT NULL
                                 CHECK (length(application_text) >= 50),
  numbers_summary    text,                             -- nullable P&L / pricing context
  status             text        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'selected', 'rejected', 'withdrawn')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  reviewed_at        timestamptz,
  reviewed_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (event_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hot_seat_apps_event_status
  ON hot_seat_applications (event_id, status);

CREATE INDEX IF NOT EXISTS idx_hot_seat_apps_user_id
  ON hot_seat_applications (user_id);

-- Trigger: block applications to non-workshop events.
CREATE OR REPLACE FUNCTION trg_hot_seat_workshop_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_type text;
BEGIN
  SELECT event_type
  INTO   v_event_type
  FROM   live_events
  WHERE  id = NEW.event_id;

  IF v_event_type IS NULL THEN
    RAISE EXCEPTION 'hot_seat_applications: event_id % not found', NEW.event_id;
  END IF;

  IF v_event_type <> 'workshop' THEN
    RAISE EXCEPTION 'Hot seats are workshop-only. Event % is of type ''%''.',
      NEW.event_id, v_event_type;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'enforce_hot_seat_workshop_only'
      AND tgrelid = 'hot_seat_applications'::regclass
  ) THEN
    CREATE TRIGGER enforce_hot_seat_workshop_only
      BEFORE INSERT OR UPDATE ON hot_seat_applications
      FOR EACH ROW EXECUTE FUNCTION trg_hot_seat_workshop_only();
  END IF;
END;
$$;


-- =============================================================================
-- 7. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE live_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_event_replays   ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_event_rsvps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_seat_applications ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 7a. RLS policies: live_events
-- =============================================================================
-- Access matrix (SELECT):
--   workshop events  → tier_rank >= 1  (Library, Workshop, AI Lab all see them)
--   ai_lab events    → tier_rank >= 3  (AI Lab only; lower tiers cannot see)
--
-- Library members can see workshop existence so the RSVP / upgrade CTA renders.
-- They cannot see ai_lab events at all — not even the title.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_events' AND policyname = 'live_events_select_tier'
  ) THEN
    DROP POLICY live_events_select_tier ON live_events;
  END IF;
END;
$$;

CREATE POLICY live_events_select_tier
  ON live_events
  FOR SELECT
  TO authenticated
  USING (
    (event_type = 'workshop' AND (SELECT current_user_tier_rank()) >= 1)
    OR
    (event_type = 'ai_lab'   AND (SELECT current_user_tier_rank()) >= 3)
  );

-- Admin SELECT: admins see everything (separate permissive policy so the OR
-- logic doesn't complicate the member policy expression).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_events' AND policyname = 'live_events_select_admin'
  ) THEN
    DROP POLICY live_events_select_admin ON live_events;
  END IF;
END;
$$;

CREATE POLICY live_events_select_admin
  ON live_events
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

-- Admin INSERT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_events' AND policyname = 'live_events_insert_admin'
  ) THEN
    DROP POLICY live_events_insert_admin ON live_events;
  END IF;
END;
$$;

CREATE POLICY live_events_insert_admin
  ON live_events
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

-- Admin UPDATE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_events' AND policyname = 'live_events_update_admin'
  ) THEN
    DROP POLICY live_events_update_admin ON live_events;
  END IF;
END;
$$;

CREATE POLICY live_events_update_admin
  ON live_events
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- Admin DELETE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_events' AND policyname = 'live_events_delete_admin'
  ) THEN
    DROP POLICY live_events_delete_admin ON live_events;
  END IF;
END;
$$;

CREATE POLICY live_events_delete_admin
  ON live_events
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));


-- =============================================================================
-- 7b. RLS policies: live_event_replays
-- =============================================================================
-- Access matrix (SELECT):
--   workshop replay, tier_rank >= 2  → immediate access
--   workshop replay, tier_rank >= 1  → access after published_at + 30 days
--   ai_lab replay,   tier_rank >= 3  → immediate access, never released lower
--
-- The 30-day delay is measured from published_at (the date the replay was
-- published), not from the event's starts_at — consistent with the spec note
-- "a workshop recorded on May 1 becomes visible to Library tier on May 31."
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_event_replays' AND policyname = 'replays_select_tier'
  ) THEN
    DROP POLICY replays_select_tier ON live_event_replays;
  END IF;
END;
$$;

CREATE POLICY replays_select_tier
  ON live_event_replays
  FOR SELECT
  TO authenticated
  USING (
    -- Workshop replay: immediate for T2+
    (event_type = 'workshop' AND (SELECT current_user_tier_rank()) >= 2)
    OR
    -- Workshop replay: 30-day delayed access for T1 (Library)
    (event_type = 'workshop' AND (SELECT current_user_tier_rank()) >= 1
      AND published_at < now() - INTERVAL '30 days')
    OR
    -- AI Lab replay: AI Lab only, never released to lower tiers
    (event_type = 'ai_lab' AND (SELECT current_user_tier_rank()) >= 3)
  );

-- Admin SELECT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_event_replays' AND policyname = 'replays_select_admin'
  ) THEN
    DROP POLICY replays_select_admin ON live_event_replays;
  END IF;
END;
$$;

CREATE POLICY replays_select_admin
  ON live_event_replays
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

-- Admin INSERT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_event_replays' AND policyname = 'replays_insert_admin'
  ) THEN
    DROP POLICY replays_insert_admin ON live_event_replays;
  END IF;
END;
$$;

CREATE POLICY replays_insert_admin
  ON live_event_replays
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

-- Admin UPDATE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_event_replays' AND policyname = 'replays_update_admin'
  ) THEN
    DROP POLICY replays_update_admin ON live_event_replays;
  END IF;
END;
$$;

CREATE POLICY replays_update_admin
  ON live_event_replays
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- Admin DELETE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_event_replays' AND policyname = 'replays_delete_admin'
  ) THEN
    DROP POLICY replays_delete_admin ON live_event_replays;
  END IF;
END;
$$;

CREATE POLICY replays_delete_admin
  ON live_event_replays
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));


-- =============================================================================
-- 7c. RLS policies: live_event_rsvps
-- =============================================================================
-- SELECT: own rows only; admin sees all.
-- INSERT: authenticated user, auth.uid() = user_id, AND user's tier_rank meets
--         the event's min_tier_rank. The WITH CHECK subquery reads live_events
--         for the target event_id — this is acceptable on INSERT (one query
--         per insert, not per-row on a SELECT scan).
-- UPDATE: own rows only (change rsvp_status, mark attended).
-- DELETE: own rows only.
-- =============================================================================

-- SELECT own
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_event_rsvps' AND policyname = 'rsvps_select_own'
  ) THEN
    DROP POLICY rsvps_select_own ON live_event_rsvps;
  END IF;
END;
$$;

CREATE POLICY rsvps_select_own
  ON live_event_rsvps
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- SELECT admin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_event_rsvps' AND policyname = 'rsvps_select_admin'
  ) THEN
    DROP POLICY rsvps_select_admin ON live_event_rsvps;
  END IF;
END;
$$;

CREATE POLICY rsvps_select_admin
  ON live_event_rsvps
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

-- INSERT: own row, tier meets event requirement
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_event_rsvps' AND policyname = 'rsvps_insert_own'
  ) THEN
    DROP POLICY rsvps_insert_own ON live_event_rsvps;
  END IF;
END;
$$;

CREATE POLICY rsvps_insert_own
  ON live_event_rsvps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (SELECT current_user_tier_rank()) >= (
      SELECT min_tier_rank
      FROM   live_events
      WHERE  id = event_id
    )
  );

-- UPDATE own
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_event_rsvps' AND policyname = 'rsvps_update_own'
  ) THEN
    DROP POLICY rsvps_update_own ON live_event_rsvps;
  END IF;
END;
$$;

CREATE POLICY rsvps_update_own
  ON live_event_rsvps
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE own
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_event_rsvps' AND policyname = 'rsvps_delete_own'
  ) THEN
    DROP POLICY rsvps_delete_own ON live_event_rsvps;
  END IF;
END;
$$;

CREATE POLICY rsvps_delete_own
  ON live_event_rsvps
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- =============================================================================
-- 7d. RLS policies: hot_seat_applications
-- =============================================================================
-- SELECT: own rows only; admin sees all.
-- INSERT: authenticated user, auth.uid() = user_id, tier_rank >= 2.
--         The trigger (trg_hot_seat_workshop_only) enforces workshop-only at the
--         DB level — no need to duplicate that logic here.
-- UPDATE: two permissive policies OR'd by Postgres:
--         (a) user updates own pending application (text / numbers_summary /
--             withdraw by changing status to 'withdrawn');
--         (b) admin updates any application (to set status selected/rejected).
-- DELETE: user can delete their own pending application.
-- =============================================================================

-- SELECT own
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hot_seat_applications' AND policyname = 'hot_seat_select_own'
  ) THEN
    DROP POLICY hot_seat_select_own ON hot_seat_applications;
  END IF;
END;
$$;

CREATE POLICY hot_seat_select_own
  ON hot_seat_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- SELECT admin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hot_seat_applications' AND policyname = 'hot_seat_select_admin'
  ) THEN
    DROP POLICY hot_seat_select_admin ON hot_seat_applications;
  END IF;
END;
$$;

CREATE POLICY hot_seat_select_admin
  ON hot_seat_applications
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

-- INSERT: own row, Workshop tier minimum (tier_rank >= 2)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hot_seat_applications' AND policyname = 'hot_seat_insert_own'
  ) THEN
    DROP POLICY hot_seat_insert_own ON hot_seat_applications;
  END IF;
END;
$$;

CREATE POLICY hot_seat_insert_own
  ON hot_seat_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (SELECT current_user_tier_rank()) >= 2
  );

-- UPDATE own pending (user edits text / numbers_summary / self-withdraws)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hot_seat_applications' AND policyname = 'hot_seat_update_own'
  ) THEN
    DROP POLICY hot_seat_update_own ON hot_seat_applications;
  END IF;
END;
$$;

CREATE POLICY hot_seat_update_own
  ON hot_seat_applications
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id
    -- Users may only move their own application to 'withdrawn'; they cannot
    -- self-select or self-reject. The status check in USING already restricts
    -- to 'pending' rows; WITH CHECK ensures they can only write 'pending' or
    -- 'withdrawn' as the new status.
    AND status IN ('pending', 'withdrawn')
  );

-- UPDATE admin (can set status to selected / rejected / any value)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hot_seat_applications' AND policyname = 'hot_seat_update_admin'
  ) THEN
    DROP POLICY hot_seat_update_admin ON hot_seat_applications;
  END IF;
END;
$$;

CREATE POLICY hot_seat_update_admin
  ON hot_seat_applications
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- DELETE own pending
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hot_seat_applications' AND policyname = 'hot_seat_delete_own'
  ) THEN
    DROP POLICY hot_seat_delete_own ON hot_seat_applications;
  END IF;
END;
$$;

CREATE POLICY hot_seat_delete_own
  ON hot_seat_applications
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );


COMMIT;
