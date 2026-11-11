-- =============================================================================
-- Karma Recode — a members-only tab inside the portal
-- =============================================================================
-- Karma Recode buyers get Lifinity plus a "Karma Recode" tab with content only
-- they can watch, for one year from purchase (purchases before 1 June 2026
-- count from 1 June 2026).
--
--   karma_recode_members      who bought it and until when. Keyed by email so
--                             a buyer is covered before their account exists.
--   content_folders.is_karma_recode
--                             a folder (and everything below it) that belongs
--                             to the Karma Recode tab instead of the library.
--   video_summaries policy    those videos are readable only by current Karma
--                             Recode members and the team — enforced by the
--                             database, not just hidden in the page.
--
-- Idempotent — safe to re-run.
-- =============================================================================

BEGIN;

-- 1. Who has Karma Recode ----------------------------------------------------

CREATE TABLE IF NOT EXISTS karma_recode_members (
  email         text        PRIMARY KEY CHECK (email = lower(btrim(email))),
  name          text,
  phone         text,
  -- Date they bought Karma Recode. Null when the sheet didn't say.
  purchased_on  date,
  expires_at    timestamptz NOT NULL,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS karma_recode_members_set_updated_at ON karma_recode_members;
CREATE TRIGGER karma_recode_members_set_updated_at
  BEFORE UPDATE ON karma_recode_members
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

ALTER TABLE karma_recode_members ENABLE ROW LEVEL SECURITY;

-- A member may read their own row (to show "access until …"); only the
-- service role writes.
DROP POLICY IF EXISTS "Own Karma Recode row" ON karma_recode_members;
CREATE POLICY "Own Karma Recode row" ON karma_recode_members
  FOR SELECT USING (
    email = lower((SELECT email FROM auth.users WHERE id = (SELECT auth.uid())))
  );

-- 2. Folders that belong to the Karma Recode tab -----------------------------

ALTER TABLE content_folders
  ADD COLUMN IF NOT EXISTS is_karma_recode boolean NOT NULL DEFAULT false;

-- 3. Helpers -----------------------------------------------------------------

-- True when the signed-in person currently has Karma Recode, or is on the team.
CREATE OR REPLACE FUNCTION can_view_karma_recode()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('admin', 'recording_admin', 'staff')
    )
    OR EXISTS (
      SELECT 1
      FROM karma_recode_members k
      JOIN auth.users u ON lower(u.email) = k.email
      WHERE u.id = (SELECT auth.uid())
        AND k.expires_at > now()
    );
$$;

-- True when the folder, or any folder above it, is marked Karma Recode.
CREATE OR REPLACE FUNCTION folder_is_karma_recode(fid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE up AS (
    SELECT id, parent_id, is_karma_recode, 1 AS depth FROM content_folders WHERE id = fid
    UNION ALL
    SELECT f.id, f.parent_id, f.is_karma_recode, up.depth + 1
    FROM content_folders f
    JOIN up ON f.id = up.parent_id
    WHERE up.depth < 20
  )
  SELECT COALESCE(bool_or(is_karma_recode), false) FROM up;
$$;

REVOKE ALL ON FUNCTION can_view_karma_recode()       FROM PUBLIC;
REVOKE ALL ON FUNCTION folder_is_karma_recode(uuid)  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION can_view_karma_recode()      TO authenticated;
GRANT EXECUTE ON FUNCTION folder_is_karma_recode(uuid) TO authenticated;

-- 4. Only Karma Recode members and the team can read Karma Recode videos ------

DROP POLICY IF EXISTS "Published summaries viewable" ON video_summaries;
CREATE POLICY "Published summaries viewable" ON video_summaries
  FOR SELECT USING (
    is_published = true
    AND auth.role() = 'authenticated'
    AND (
      folder_id IS NULL
      OR NOT folder_is_karma_recode(folder_id)
      OR can_view_karma_recode()
    )
  );

COMMIT;
