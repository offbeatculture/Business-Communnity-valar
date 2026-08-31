-- ══════════════════════════════════════════════════════════════
-- Daily Practice Check-in
--
-- Three yes/no questions a member answers once a day:
--   1. Did you blow minimum 3 balloons today?
--   2. Did you do your 4-7-8 breathwork practice?
--   3. Did you do 5 minutes of grounding practice?
--
-- Questions are admin-editable and can optionally be scoped to a kosha
-- week, so the standing three can be swapped for week-specific ones
-- later without a migration.
--
-- Rules, per product decision:
--   · No backfill. A day can only be logged on that day (IST), so the
--     log stays evidence of daily practice rather than of memory.
--   · Editable until midnight IST — people check in before they have
--     finished their day.
--   · Points scale with how many were actually done, and answering
--     "no" to all three still counts as showing up. Honesty should not
--     cost a member their streak.
-- ══════════════════════════════════════════════════════════════

-- ── Questions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkin_questions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text       NOT NULL,
  -- NULL = the standing set shown every day.
  -- 1–5   = shown only during that kosha week, once weekly rotation exists.
  week_number  smallint    CHECK (week_number IS NULL OR week_number BETWEEN 1 AND 5),
  sort_order   integer     NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkin_questions_active
  ON checkin_questions (is_active, week_number, sort_order);

-- ── Check-ins: one row per member per IST day ────────────────
CREATE TABLE IF NOT EXISTS daily_checkins (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date  date        NOT NULL,
  -- { "<question_id>": true | false }
  answers       jsonb       NOT NULL DEFAULT '{}',
  yes_count     smallint    NOT NULL DEFAULT 0,
  total_count   smallint    NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
  ON daily_checkins (user_id, checkin_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_date
  ON daily_checkins (checkin_date DESC);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE checkin_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read active checkin questions" ON checkin_questions;
CREATE POLICY "Authenticated can read active checkin questions"
  ON checkin_questions FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage checkin questions" ON checkin_questions;
CREATE POLICY "Admins manage checkin questions"
  ON checkin_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Users read own checkins" ON daily_checkins;
CREATE POLICY "Users read own checkins"
  ON daily_checkins FOR SELECT TO authenticated
  USING (user_id = auth.uid());
-- Writes go through submit_daily_checkin() (SECURITY DEFINER) only.

-- ── Seed the standing three ──────────────────────────────────
INSERT INTO checkin_questions (question_text, week_number, sort_order)
SELECT * FROM (VALUES
  ('Did you blow minimum 3 balloons today?',        NULL::smallint, 1),
  ('Did you do your 4-7-8 breathwork practice?',    NULL::smallint, 2),
  ('Did you do 5 minutes of grounding practice?',   NULL::smallint, 3)
) AS q(question_text, week_number, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM checkin_questions WHERE week_number IS NULL
);

-- ── Submit ───────────────────────────────────────────────────
-- Returns the stored row plus what it awarded. Same-day resubmission
-- updates the answers; GP is granted once per day by award_points' cap.
CREATE OR REPLACE FUNCTION public.submit_daily_checkin(
  p_user_id UUID,
  p_answers JSONB
)
RETURNS JSON AS $$
DECLARE
  v_today       DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_yes         SMALLINT := 0;
  v_total       SMALLINT := 0;
  v_gp          INTEGER;
  v_award       JSON;
  v_was_first   BOOLEAN;
BEGIN
  -- Count answers. Anything not strictly true counts as "not today".
  -- Aliased explicitly: jsonb_each exposes a column literally named
  -- "value", which is too easy to shadow or misresolve.
  SELECT
    COUNT(*)::SMALLINT,
    COUNT(*) FILTER (WHERE a.v = 'true'::jsonb)::SMALLINT
  INTO v_total, v_yes
  FROM jsonb_each(p_answers) AS a(k, v);

  IF v_total = 0 THEN
    RETURN json_build_object('error', 'no answers submitted');
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM daily_checkins
    WHERE user_id = p_user_id AND checkin_date = v_today
  ) INTO v_was_first;

  INSERT INTO daily_checkins (user_id, checkin_date, answers, yes_count, total_count)
  VALUES (p_user_id, v_today, p_answers, v_yes, v_total)
  ON CONFLICT (user_id, checkin_date) DO UPDATE
    SET answers    = EXCLUDED.answers,
        yes_count  = EXCLUDED.yes_count,
        total_count = EXCLUDED.total_count,
        updated_at = NOW();

  -- 4 for showing up + 2 per practice actually done.
  v_gp := 4 + (2 * v_yes);

  IF v_was_first THEN
    v_award := public.award_points(p_user_id, 'daily_checkin', v_gp);
  ELSE
    v_award := json_build_object('gp_earned', 0, 'capped', true);
  END IF;

  RETURN json_build_object(
    'checkin_date', v_today,
    'yes_count',    v_yes,
    'total_count',  v_total,
    'first_today',  v_was_first,
    'award',        v_award
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Fix: teach award_points the new action ───────────────────
-- award_points falls through to ELSE 0, and a cap of 0 makes the
-- `count >= cap` guard return early with gp_earned = 0. Any action not
-- named here silently awards nothing, so 'daily_checkin' has to be
-- added or the whole feature banks no points.
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id UUID,
  p_action TEXT,
  p_gp INTEGER,
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_daily_count INTEGER;
  v_daily_cap INTEGER;
  v_actual_gp INTEGER;
  v_new_total INTEGER;
  v_new_level SMALLINT;
BEGIN
  v_daily_cap := CASE p_action
    WHEN 'post' THEN 2
    WHEN 'prompt_response' THEN 1
    WHEN 'comment' THEN 5
    WHEN 'comment_received' THEN 10
    WHEN 'like_received' THEN 15
    WHEN 'like_given' THEN 10
    WHEN 'daily_visit' THEN 1
    WHEN 'content_view' THEN 3
    WHEN 'assessment_complete' THEN 1
    WHEN 'profile_setup' THEN 1
    WHEN 'daily_checkin' THEN 1
    ELSE 0
  END;

  SELECT COUNT(*) INTO v_daily_count
  FROM engagement_log
  WHERE user_id = p_user_id
    AND action = p_action
    AND earned_date = v_today;

  IF v_daily_count >= v_daily_cap THEN
    RETURN json_build_object('gp_earned', 0, 'total_gp', (
      SELECT total_gp FROM member_levels WHERE user_id = p_user_id
    ), 'capped', true);
  END IF;

  v_actual_gp := p_gp;

  INSERT INTO engagement_log (user_id, action, gp_earned, reference_id, earned_date)
  VALUES (p_user_id, p_action, v_actual_gp, p_reference_id, v_today);

  INSERT INTO member_levels (user_id, total_gp)
  VALUES (p_user_id, v_actual_gp)
  ON CONFLICT (user_id) DO UPDATE
  SET total_gp = member_levels.total_gp + v_actual_gp,
      updated_at = NOW();

  SELECT total_gp INTO v_new_total
  FROM member_levels WHERE user_id = p_user_id;

  v_new_level := CASE
    WHEN v_new_total >= 25000 THEN 7
    WHEN v_new_total >= 10000 THEN 6
    WHEN v_new_total >= 4000 THEN 5
    WHEN v_new_total >= 1500 THEN 4
    WHEN v_new_total >= 500 THEN 3
    WHEN v_new_total >= 100 THEN 2
    ELSE 1
  END;

  UPDATE member_levels
  SET current_level = v_new_level, updated_at = NOW()
  WHERE user_id = p_user_id AND current_level != v_new_level;

  RETURN json_build_object(
    'gp_earned', v_actual_gp,
    'total_gp', v_new_total,
    'new_level', v_new_level,
    'capped', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
