-- =============================================
-- ENGAGEMENT SYSTEM: Growth Points, Levels, Streaks, Daily Prompts
-- =============================================

-- 1. member_levels — per-user engagement state (one row per user)
CREATE TABLE member_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_gp INTEGER NOT NULL DEFAULT 0,
  current_level SMALLINT NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_visit_date DATE,
  grace_used_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_member_levels_user ON member_levels(user_id);
CREATE INDEX idx_member_levels_gp ON member_levels(total_gp DESC);

-- 2. engagement_log — immutable event log for cap enforcement + audit
CREATE TABLE engagement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  gp_earned INTEGER NOT NULL,
  reference_id UUID,
  earned_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_engagement_log_user_date ON engagement_log(user_id, earned_date);
CREATE INDEX idx_engagement_log_user_action_date ON engagement_log(user_id, action, earned_date);

-- 3. daily_prompts — admin-authored daily questions
CREATE TABLE daily_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text TEXT NOT NULL,
  category TEXT DEFAULT 'reflection'
    CHECK (category IN ('reflection','challenge','number','advice','wins')),
  scheduled_date DATE NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_daily_prompts_date ON daily_prompts(scheduled_date);

-- 4. Existing table changes
ALTER TABLE posts ADD COLUMN prompt_id UUID REFERENCES daily_prompts(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN tagline TEXT;
ALTER TABLE profiles ADD COLUMN banner_color TEXT;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE member_levels ENABLE ROW LEVEL SECURITY;
-- All authenticated can read (needed for profile badges)
CREATE POLICY "Authenticated users can view member levels"
  ON member_levels FOR SELECT
  USING (auth.role() = 'authenticated');
-- No direct INSERT/UPDATE/DELETE — all mutations via SECURITY DEFINER functions

ALTER TABLE engagement_log ENABLE ROW LEVEL SECURITY;
-- Users can only read their own log
CREATE POLICY "Users can view own engagement log"
  ON engagement_log FOR SELECT
  USING (auth.uid() = user_id);
-- No direct INSERT — only via SECURITY DEFINER functions

ALTER TABLE daily_prompts ENABLE ROW LEVEL SECURITY;
-- All authenticated can read active prompts
CREATE POLICY "Authenticated users can view active prompts"
  ON daily_prompts FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');
-- Admin full CRUD
CREATE POLICY "Admins can manage prompts"
  ON daily_prompts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- =============================================
-- PL/pgSQL FUNCTION: award_points
-- Atomic: checks daily cap → inserts log → increments GP → recalculates level
-- =============================================

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
  -- Determine daily cap per action type
  v_daily_cap := CASE p_action
    WHEN 'post' THEN 2
    WHEN 'prompt_response' THEN 1
    WHEN 'comment' THEN 5
    WHEN 'comment_received' THEN 10
    WHEN 'like_received' THEN 15
    WHEN 'like_given' THEN 10
    WHEN 'daily_visit' THEN 1
    WHEN 'content_view' THEN 3
    ELSE 0
  END;

  -- Count today's actions of this type for this user
  SELECT COUNT(*) INTO v_daily_count
  FROM engagement_log
  WHERE user_id = p_user_id
    AND action = p_action
    AND earned_date = v_today;

  -- If at cap, return 0 GP earned
  IF v_daily_count >= v_daily_cap THEN
    RETURN json_build_object('gp_earned', 0, 'total_gp', (
      SELECT total_gp FROM member_levels WHERE user_id = p_user_id
    ), 'capped', true);
  END IF;

  v_actual_gp := p_gp;

  -- Insert log entry
  INSERT INTO engagement_log (user_id, action, gp_earned, reference_id, earned_date)
  VALUES (p_user_id, p_action, v_actual_gp, p_reference_id, v_today);

  -- Upsert member_levels + increment GP atomically
  INSERT INTO member_levels (user_id, total_gp)
  VALUES (p_user_id, v_actual_gp)
  ON CONFLICT (user_id) DO UPDATE
  SET total_gp = member_levels.total_gp + v_actual_gp,
      updated_at = NOW();

  -- Get new total
  SELECT total_gp INTO v_new_total
  FROM member_levels WHERE user_id = p_user_id;

  -- Recalculate level from GP thresholds
  v_new_level := CASE
    WHEN v_new_total >= 25000 THEN 7
    WHEN v_new_total >= 10000 THEN 6
    WHEN v_new_total >= 4000 THEN 5
    WHEN v_new_total >= 1500 THEN 4
    WHEN v_new_total >= 500 THEN 3
    WHEN v_new_total >= 100 THEN 2
    ELSE 1
  END;

  -- Update level if changed
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

-- =============================================
-- PL/pgSQL FUNCTION: record_daily_visit
-- Atomic with FOR UPDATE row lock: streak management + visit GP
-- =============================================

CREATE OR REPLACE FUNCTION public.record_daily_visit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_row member_levels%ROWTYPE;
  v_yesterday DATE := v_today - INTERVAL '1 day';
  v_two_days_ago DATE := v_today - INTERVAL '2 days';
  v_new_streak INTEGER;
  v_streak_broken BOOLEAN := false;
  v_visit_gp JSON;
  v_streak_bonus INTEGER := 0;
  v_grace_used BOOLEAN := false;
BEGIN
  -- Upsert to ensure row exists, then lock it
  INSERT INTO member_levels (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row
  FROM member_levels
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Already visited today
  IF v_row.last_visit_date = v_today THEN
    RETURN json_build_object(
      'already_visited', true,
      'current_streak', v_row.current_streak,
      'total_gp', v_row.total_gp
    );
  END IF;

  -- Determine streak continuation
  IF v_row.last_visit_date = v_yesterday THEN
    -- Consecutive day — streak continues
    v_new_streak := v_row.current_streak + 1;
  ELSIF v_row.last_visit_date = v_two_days_ago
    AND (v_row.grace_used_at IS NULL OR v_row.grace_used_at < v_today - INTERVAL '7 days')
  THEN
    -- Missed 1 day, grace period available (1 per 7-day window)
    v_new_streak := v_row.current_streak + 1;
    v_grace_used := true;
  ELSIF v_row.last_visit_date IS NULL THEN
    -- First ever visit
    v_new_streak := 1;
  ELSE
    -- Streak broken
    v_new_streak := 1;
    v_streak_broken := true;
  END IF;

  -- Update member_levels
  UPDATE member_levels SET
    last_visit_date = v_today,
    current_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    grace_used_at = CASE WHEN v_grace_used THEN v_today ELSE grace_used_at END,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Award daily visit GP (3 GP, cap 1/day) via award_points
  v_visit_gp := public.award_points(p_user_id, 'daily_visit', 3);

  -- Check streak milestone bonuses
  IF v_new_streak > 0 AND v_new_streak % 7 = 0 THEN
    -- Weekly streak bonus (+10 GP)
    v_streak_bonus := 10;
    INSERT INTO engagement_log (user_id, action, gp_earned, earned_date)
    VALUES (p_user_id, 'streak_bonus_weekly', 10, v_today);
  END IF;

  -- One-time streak milestones
  IF v_new_streak = 30 AND NOT v_streak_broken THEN
    v_streak_bonus := v_streak_bonus + 50;
    INSERT INTO engagement_log (user_id, action, gp_earned, earned_date)
    VALUES (p_user_id, 'streak_bonus_30', 50, v_today);
  ELSIF v_new_streak = 90 THEN
    v_streak_bonus := v_streak_bonus + 150;
    INSERT INTO engagement_log (user_id, action, gp_earned, earned_date)
    VALUES (p_user_id, 'streak_bonus_90', 150, v_today);
  ELSIF v_new_streak = 365 THEN
    v_streak_bonus := v_streak_bonus + 500;
    INSERT INTO engagement_log (user_id, action, gp_earned, earned_date)
    VALUES (p_user_id, 'streak_bonus_365', 500, v_today);
  END IF;

  -- Apply streak bonus GP if any
  IF v_streak_bonus > 0 THEN
    UPDATE member_levels
    SET total_gp = total_gp + v_streak_bonus, updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Recalculate level after streak bonus
  UPDATE member_levels SET
    current_level = CASE
      WHEN total_gp >= 25000 THEN 7
      WHEN total_gp >= 10000 THEN 6
      WHEN total_gp >= 4000 THEN 5
      WHEN total_gp >= 1500 THEN 4
      WHEN total_gp >= 500 THEN 3
      WHEN total_gp >= 100 THEN 2
      ELSE 1
    END
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'already_visited', false,
    'current_streak', v_new_streak,
    'streak_broken', v_streak_broken,
    'grace_used', v_grace_used,
    'streak_bonus', v_streak_bonus,
    'total_gp', (SELECT total_gp FROM member_levels WHERE user_id = p_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PL/pgSQL FUNCTION: get_weekly_highlights
-- Returns most helpful, top responders, and rising star
-- =============================================

CREATE OR REPLACE FUNCTION public.get_weekly_highlights()
RETURNS JSON AS $$
DECLARE
  v_week_start DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE - INTERVAL '7 days';
  v_month_ago DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE - INTERVAL '30 days';
  v_most_helpful JSON;
  v_top_responders JSON;
  v_rising_star JSON;
BEGIN
  -- Most Helpful: users whose posts got most likes this week
  SELECT json_agg(row_to_json(t)) INTO v_most_helpful FROM (
    SELECT e.user_id, p.full_name, p.avatar_url, SUM(e.gp_earned) as total_likes_gp
    FROM engagement_log e
    JOIN profiles p ON p.user_id = e.user_id
    WHERE e.action = 'like_received'
      AND e.earned_date >= v_week_start
    GROUP BY e.user_id, p.full_name, p.avatar_url
    ORDER BY total_likes_gp DESC
    LIMIT 3
  ) t;

  -- Top Responders: most daily prompt responses this week
  SELECT json_agg(row_to_json(t)) INTO v_top_responders FROM (
    SELECT e.user_id, p.full_name, p.avatar_url, COUNT(*) as prompt_count
    FROM engagement_log e
    JOIN profiles p ON p.user_id = e.user_id
    WHERE e.action = 'prompt_response'
      AND e.earned_date >= v_week_start
    GROUP BY e.user_id, p.full_name, p.avatar_url
    ORDER BY prompt_count DESC
    LIMIT 3
  ) t;

  -- Rising Star: newest member (<30 days) with most GP this week
  SELECT row_to_json(t) INTO v_rising_star FROM (
    SELECT ml.user_id, p.full_name, p.avatar_url, ml.total_gp
    FROM member_levels ml
    JOIN profiles p ON p.user_id = ml.user_id
    WHERE p.created_at >= v_month_ago
    ORDER BY ml.total_gp DESC
    LIMIT 1
  ) t;

  RETURN json_build_object(
    'most_helpful', COALESCE(v_most_helpful, '[]'::json),
    'top_responders', COALESCE(v_top_responders, '[]'::json),
    'rising_star', v_rising_star
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- UPDATE AUTH TRIGGER: Auto-create member_levels on signup
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  INSERT INTO public.member_levels (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- BACKFILL: Create member_levels for existing users + retroactive GP
-- =============================================

-- Create member_levels for all existing users
INSERT INTO member_levels (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Retroactive GP: existing posts (15 GP each)
UPDATE member_levels ml SET total_gp = total_gp + COALESCE(sub.gp, 0)
FROM (
  SELECT user_id, COUNT(*) * 15 AS gp
  FROM posts GROUP BY user_id
) sub
WHERE ml.user_id = sub.user_id;

-- Retroactive GP: existing comments (8 GP each, simplified)
UPDATE member_levels ml SET total_gp = total_gp + COALESCE(sub.gp, 0)
FROM (
  SELECT user_id, COUNT(*) * 8 AS gp
  FROM comments GROUP BY user_id
) sub
WHERE ml.user_id = sub.user_id;

-- Retroactive GP: likes given (1 GP each)
UPDATE member_levels ml SET total_gp = total_gp + COALESCE(sub.gp, 0)
FROM (
  SELECT user_id, COUNT(*) * 1 AS gp
  FROM likes GROUP BY user_id
) sub
WHERE ml.user_id = sub.user_id;

-- Retroactive GP: likes received on posts (5 GP each)
UPDATE member_levels ml SET total_gp = total_gp + COALESCE(sub.gp, 0)
FROM (
  SELECT p.user_id, COUNT(l.id) * 5 AS gp
  FROM likes l JOIN posts p ON l.post_id = p.id
  GROUP BY p.user_id
) sub
WHERE ml.user_id = sub.user_id;

-- Recalculate levels for all backfilled users
UPDATE member_levels SET current_level = CASE
  WHEN total_gp >= 25000 THEN 7
  WHEN total_gp >= 10000 THEN 6
  WHEN total_gp >= 4000 THEN 5
  WHEN total_gp >= 1500 THEN 4
  WHEN total_gp >= 500 THEN 3
  WHEN total_gp >= 100 THEN 2
  ELSE 1
END;
