-- ══════════════════════════════════════════════════════════════
-- Panchakosha Scan — 30-question assessment + retake history
--
-- Source: "Panchakosha Program Structure & Assessment" (Dr Valarmathi)
--   6 statements per kosha, scored 0 (not at all true) to 5 (extremely
--   true). Each kosha totals out of 30. Highest = Primary imbalance,
--   second-highest = Secondary.
--
-- This migration does three things:
--   1. Allows scoring_type = 'kosha'
--   2. Replaces the one-result-per-user rule with attempt history, so
--      members can retake the scan at the end of a cycle and see a
--      before/after comparison (the renewal conversation).
--   3. Seeds the assessment and all 30 statements.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Allow the 'kosha' scoring type ────────────────────────
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_scoring_type_check;
ALTER TABLE assessments ADD CONSTRAINT assessments_scoring_type_check
  CHECK (scoring_type IN ('scale-code', 'generic', 'kosha'));

-- ── 2. Attempt history ───────────────────────────────────────
-- The old UNIQUE(user_id, assessment_id) allowed exactly one result per
-- user forever, which blocks the reassessment the program depends on.
ALTER TABLE assessment_results
  DROP CONSTRAINT IF EXISTS assessment_results_user_id_assessment_id_key;

ALTER TABLE assessment_results
  ADD COLUMN IF NOT EXISTS attempt_number integer NOT NULL DEFAULT 1;

-- Latest attempt is derived by MAX(attempt_number) rather than a flag,
-- so there is no second row to keep in sync and no write race.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_user_assessment_attempt
  ON assessment_results (user_id, assessment_id, attempt_number);

CREATE INDEX IF NOT EXISTS idx_ar_user_assessment_attempt_desc
  ON assessment_results (user_id, assessment_id, attempt_number DESC);

-- ── 3. Seed the Panchakosha Scan ─────────────────────────────
INSERT INTO assessments (id, title, slug, description, scoring_type, is_published)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'The Panchakosha Scan',
  'kosha-scan',
  '30 statements. About 4 minutes. Shows which of your five layers is asking for attention first.',
  'kosha',
  true
)
ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title,
      description = EXCLUDED.description,
      scoring_type = EXCLUDED.scoring_type;

-- All 30 statements share the same 0–5 agreement scale.
DELETE FROM assessment_questions
WHERE assessment_id = '00000000-0000-0000-0000-000000000002';

INSERT INTO assessment_questions
  (assessment_id, category, question_text, sort_order, options)
SELECT
  '00000000-0000-0000-0000-000000000002',
  q.category,
  q.question_text,
  q.sort_order,
  '[
    {"label": "Not at all true", "value": "0", "score": 0},
    {"label": "Rarely true",     "value": "1", "score": 1},
    {"label": "Sometimes true",  "value": "2", "score": 2},
    {"label": "Often true",      "value": "3", "score": 3},
    {"label": "Mostly true",     "value": "4", "score": 4},
    {"label": "Extremely true",  "value": "5", "score": 5}
  ]'::jsonb
FROM (VALUES
    ('annamaya', 'I feel physically fatigued most days, regardless of how much I sleep.', 1),
    ('annamaya', 'My lower back, hips, or legs feel stiff or tight often.', 2),
    ('annamaya', 'I eat on irregular schedules or skip meals frequently.', 3),
    ('annamaya', 'I rely on caffeine, sugar, or processed food to get through the day.', 4),
    ('annamaya', 'I rarely make time for physical movement or exercise.', 5),
    ('annamaya', 'My body feels heavy, sluggish, or "stuck" most of the time.', 6),
    ('pranamaya', 'My breathing feels shallow or rushed most of the time.', 7),
    ('pranamaya', 'I catch myself holding my breath when stressed.', 8),
    ('pranamaya', 'I feel breathless or panicky in situations that shouldn''t cause it.', 9),
    ('pranamaya', 'I struggle to calm my body down quickly once triggered.', 10),
    ('pranamaya', 'I get dizzy, light-headed, or foggy during the day.', 11),
    ('pranamaya', 'I''ve never consciously practiced breathwork before this program.', 12),
    ('manomaya', 'I often feel anxious without being able to explain exactly why.', 13),
    ('manomaya', 'I replay conversations or situations over and over in my head.', 14),
    ('manomaya', 'My thoughts jump quickly to worst-case scenarios.', 15),
    ('manomaya', 'I change how I act depending on who I''m around, to avoid conflict or rejection.', 16),
    ('manomaya', 'I find it hard to relax even when nothing is currently wrong.', 17),
    ('manomaya', 'I notice the same emotional reaction (anger, fear, guilt) showing up in different situations.', 18),
    ('vijnanamaya', 'I know what I should do, but rarely follow through.', 19),
    ('vijnanamaya', 'My sense of identity feels shaped mostly by others'' expectations.', 20),
    ('vijnanamaya', 'I struggle to trust my own decisions without seeking validation.', 21),
    ('vijnanamaya', 'I find it hard to picture who I want to become, beyond just fixing problems.', 22),
    ('vijnanamaya', 'I repeat the same life patterns even after gaining new insight.', 23),
    ('vijnanamaya', 'I feel disconnected from a clear sense of purpose or direction.', 24),
    ('anandamaya', 'I have moments of genuine joy that don''t depend on outer circumstances.', 25),
    ('anandamaya', 'I can enjoy small everyday moments without waiting for a "reason."', 26),
    ('anandamaya', 'I feel a general sense of contentment more often than not.', 27),
    ('anandamaya', 'I can be fully present without my mind pulling me elsewhere.', 28),
    ('anandamaya', 'I experience laughter or lightness regularly in daily life.', 29),
    ('anandamaya', 'I feel grateful for my life as it is right now, not just for future goals.', 30)
) AS q(category, question_text, sort_order);

-- ── 4. Fix: award_points silently awarded 0 GP for two actions ───
-- award_points derives a daily cap from a CASE over p_action, falling
-- through to ELSE 0. Two actions the app awards -- 'assessment_complete'
-- and 'profile_setup' -- were never listed, so they resolved to a cap of
-- 0 and the `IF v_daily_count >= v_daily_cap` guard returned early with
-- gp_earned = 0 every time. The assessment wizard has been showing
-- "+20 GP earned" while granting nothing.
--
-- Both are once-a-day actions. Completing the kosha scan depends on this,
-- so the fix ships here rather than being deferred.
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
