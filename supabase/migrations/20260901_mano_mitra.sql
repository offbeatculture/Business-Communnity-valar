-- ══════════════════════════════════════════════════════════════
-- Mano Mitra AI — emotional check-in sessions
--
-- Stores one row per emotional check-in a member completes, including
-- the ones that stop early at the safety gate. Two reasons to keep the
-- stopped ones: the pattern is exactly what Dr Valar needs to see, and
-- an abandoned session is not the same signal as a completed one.
--
-- Nothing free-text the member writes inside an activity is stored.
-- Journalling prompts ("What am I punishing myself for?") are the most
-- private thing in the app, so answers stay in the browser and never
-- reach the server. Only the structured selections are persisted.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mano_mitra_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Step 1
  safety_outcome   text        NOT NULL DEFAULT 'cleared'
                               CHECK (safety_outcome IN ('cleared', 'stopped', 'migraine_flagged')),

  -- Step 2-4
  emotion_id       text,
  chakra           text        CHECK (chakra IS NULL OR chakra IN
                               ('root','sacral','solar_plexus','heart','throat','third_eye','crown')),
  body_zone        text,
  sensation        text,
  intensity_before smallint    CHECK (intensity_before IS NULL OR intensity_before BETWEEN 0 AND 10),
  trigger_context  text,
  need             text,

  -- Step 5-6
  activity_id      text,
  breath_id        text,

  -- Post-check
  intensity_after  smallint    CHECK (intensity_after IS NULL OR intensity_after BETWEEN 0 AND 10),
  post_feeling     text,
  next_action      text,

  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mano_mitra_user_created
  ON mano_mitra_sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mano_mitra_created
  ON mano_mitra_sessions (created_at DESC);

-- Finding members who keep arriving at a high intensity is the whole
-- point of the escalation rule, so index for it.
CREATE INDEX IF NOT EXISTS idx_mano_mitra_user_intensity
  ON mano_mitra_sessions (user_id, intensity_after DESC)
  WHERE intensity_after IS NOT NULL;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE mano_mitra_sessions ENABLE ROW LEVEL SECURITY;

-- A member's emotional history is the most sensitive data in this app.
-- Own rows only — admins get aggregates through the service role, never
-- a policy that would let one member read another's sessions.
DROP POLICY IF EXISTS "Users read own mano mitra sessions" ON mano_mitra_sessions;
CREATE POLICY "Users read own mano mitra sessions"
  ON mano_mitra_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own mano mitra sessions" ON mano_mitra_sessions;
CREATE POLICY "Users insert own mano mitra sessions"
  ON mano_mitra_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own mano mitra sessions" ON mano_mitra_sessions;
CREATE POLICY "Users update own mano mitra sessions"
  ON mano_mitra_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Points ───────────────────────────────────────────────────
-- Teach award_points the new action, or it falls to ELSE 0 and the
-- `count >= cap` guard silently grants nothing.
--
-- Capped at 2/day deliberately. This is emotional first aid, not a
-- streak to farm — someone opening it eight times in a day needs
-- support, not a bigger score.
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
    WHEN 'mano_mitra_session' THEN 2
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
