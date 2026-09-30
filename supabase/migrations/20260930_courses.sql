-- =============================================================================
-- Courses — curated, ordered playlists of existing recordings
-- =============================================================================
-- Context
-- -------
-- `video_summaries.folder_id` points at ONE monthly folder ("September 2026",
-- "August Recording", ...). That is the recording's home and must not change.
--
-- A course is a second, orthogonal grouping: the same recording can sit in
-- "September 2026" AND in the "Sunday Live Lifinity" course. A single FK cannot
-- express that, so course membership lives in a join table.
--
-- This migration is idempotent — safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Transcript column on video_summaries
-- -----------------------------------------------------------------------------
-- The course player exposes an "About" / "Transcript" tab pair. Nothing in the
-- schema stored a transcript before, so the tab had nothing to render. Adding
-- the column here keeps the tab honest: it shows real text once filled, and an
-- empty state until then.
-- -----------------------------------------------------------------------------

ALTER TABLE video_summaries
  ADD COLUMN IF NOT EXISTS transcript text;

COMMENT ON COLUMN video_summaries.transcript IS
  'Full session transcript, plain text. Rendered in the course player''s '
  'Transcript tab. Null means "not transcribed yet".';


-- -----------------------------------------------------------------------------
-- 2. TABLE: courses
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS courses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  slug         text        NOT NULL UNIQUE,
  description  text,
  -- Optional override for the course card image. When null the player and the
  -- library card fall back to the first lesson's YouTube thumbnail.
  thumbnail_url text,
  sort_order   integer     NOT NULL DEFAULT 0,
  is_published boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE courses IS
  'A curated playlist of recordings. Orthogonal to content_folders: a recording '
  'keeps its monthly folder and can additionally belong to any number of courses.';

CREATE INDEX IF NOT EXISTS courses_published_sort_idx
  ON courses (is_published, sort_order, created_at DESC);

DROP TRIGGER IF EXISTS courses_set_updated_at ON courses;
CREATE TRIGGER courses_set_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- -----------------------------------------------------------------------------
-- 3. TABLE: course_videos (join)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_videos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  uuid NOT NULL REFERENCES courses(id)         ON DELETE CASCADE,
  video_id   uuid NOT NULL REFERENCES video_summaries(id) ON DELETE CASCADE,
  -- Playback order within the course. Lower sorts first.
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, video_id)
);

COMMENT ON TABLE course_videos IS
  'Ordered membership of recordings in a course. UNIQUE(course_id, video_id) '
  'makes re-seeding safe.';

CREATE INDEX IF NOT EXISTS course_videos_course_order_idx
  ON course_videos (course_id, sort_order);

CREATE INDEX IF NOT EXISTS course_videos_video_idx
  ON course_videos (video_id);


-- -----------------------------------------------------------------------------
-- 4. RLS
-- -----------------------------------------------------------------------------
-- Same shape as video_summaries: authenticated members read published rows,
-- admins get full CRUD. is_admin() comes from 20260511_workshop_and_ai_lab_tables.
-- -----------------------------------------------------------------------------

ALTER TABLE courses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published courses viewable" ON courses;
CREATE POLICY "Published courses viewable" ON courses
  FOR SELECT USING (is_published = true AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
CREATE POLICY "Admins can manage courses" ON courses
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- A course_videos row is readable when its course is readable.
DROP POLICY IF EXISTS "Course videos viewable" ON course_videos;
CREATE POLICY "Course videos viewable" ON course_videos
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_videos.course_id
        AND c.is_published = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage course videos" ON course_videos;
CREATE POLICY "Admins can manage course videos" ON course_videos
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- -----------------------------------------------------------------------------
-- 5. SEED: the "Sunday Live Lifinity" course
-- -----------------------------------------------------------------------------

INSERT INTO courses (title, slug, description, sort_order, is_published)
VALUES (
  'Sunday Live Lifinity',
  'sunday-live-lifinity',
  'Every Sunday Soul Cleansing session, in one place. Release, heal, realign — watch them back to back or pick up where you left off.',
  0,
  true
)
ON CONFLICT (slug) DO UPDATE
  SET title       = EXCLUDED.title,
      description = EXCLUDED.description,
      is_published = true;


-- -----------------------------------------------------------------------------
-- 6. SEED: attach the Soul Cleansing recordings
-- -----------------------------------------------------------------------------
-- Membership rule: any published recording whose title or takeaway mentions
-- "Soul Cleansing". Newest session becomes lesson 1, matching the rest of the
-- library, which is newest-first everywhere.
--
-- >>> VERIFY BEFORE RUNNING <<<
-- Run this first to see exactly which recordings will be pulled in:
--
--   SELECT title, created_at, to_char(created_at, 'Day') AS weekday
--   FROM   video_summaries
--   WHERE  is_published = true
--     AND (title ILIKE '%soul cleansing%' OR one_line_takeaway ILIKE '%soul cleansing%')
--   ORDER  BY created_at DESC;
--
-- If your Sunday sessions are NOT titled "Soul Cleansing" — for example if they
-- are all called "... | Daily Breathwork Session" and only the thumbnail says
-- Soul Cleansing — swap the WHERE clause below for the day-of-week rule:
--
--   WHERE is_published = true AND EXTRACT(DOW FROM created_at) = 0
--
-- (0 = Sunday. created_at is stored UTC; if sessions are recorded late evening
-- IST, use `EXTRACT(DOW FROM created_at AT TIME ZONE 'Asia/Kolkata') = 0`.)
-- -----------------------------------------------------------------------------

WITH course AS (
  SELECT id FROM courses WHERE slug = 'sunday-live-lifinity'
),
sunday_sessions AS (
  SELECT
    v.id,
    ROW_NUMBER() OVER (ORDER BY v.created_at DESC) AS position
  FROM video_summaries v
  WHERE v.is_published = true
    AND (
      v.title              ILIKE '%soul cleansing%'
      OR v.one_line_takeaway ILIKE '%soul cleansing%'
    )
)
INSERT INTO course_videos (course_id, video_id, sort_order)
SELECT course.id, s.id, s.position
FROM   sunday_sessions s
CROSS  JOIN course
ON CONFLICT (course_id, video_id) DO UPDATE
  SET sort_order = EXCLUDED.sort_order;

COMMIT;


-- =============================================================================
-- Adjusting the course afterwards
-- =============================================================================
-- Add one recording by title:
--
--   INSERT INTO course_videos (course_id, video_id, sort_order)
--   SELECT c.id, v.id, 0
--   FROM   courses c, video_summaries v
--   WHERE  c.slug = 'sunday-live-lifinity'
--     AND  v.title = '27th September 2026 | Daily Breathwork Session'
--   ON CONFLICT (course_id, video_id) DO NOTHING;
--
-- Remove one:
--
--   DELETE FROM course_videos cv
--   USING courses c, video_summaries v
--   WHERE cv.course_id = c.id AND cv.video_id = v.id
--     AND c.slug = 'sunday-live-lifinity'
--     AND v.title = '...';
--
-- Re-number after edits (newest first):
--
--   WITH ranked AS (
--     SELECT cv.id, ROW_NUMBER() OVER (ORDER BY v.created_at DESC) AS position
--     FROM   course_videos cv
--     JOIN   courses c         ON c.id = cv.course_id
--     JOIN   video_summaries v ON v.id = cv.video_id
--     WHERE  c.slug = 'sunday-live-lifinity'
--   )
--   UPDATE course_videos cv
--   SET    sort_order = ranked.position
--   FROM   ranked
--   WHERE  ranked.id = cv.id;
-- =============================================================================
