-- =============================================================================
-- Custom thumbnails for recordings
-- =============================================================================
-- Recordings currently always show YouTube's auto-generated thumbnail, derived
-- from youtube_video_id. That picture is whatever frame YouTube picked, which
-- is often a mid-blink shot of the room.
--
-- This adds an optional per-recording cover. Null keeps the current behaviour,
-- so nothing changes for the recordings already in the library.
--
-- Idempotent — safe to re-run.
-- =============================================================================

BEGIN;

ALTER TABLE video_summaries
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

COMMENT ON COLUMN video_summaries.thumbnail_url IS
  'Optional custom cover image for this recording. Either an uploaded file in '
  'the video-covers bucket or an external URL. Null falls back to YouTube''s '
  'own thumbnail for youtube_video_id.';

COMMIT;


-- =============================================================================
-- Storage bucket
-- =============================================================================
-- Public for the same reason as folder-covers and avatars: these are
-- decorative images rendered in <img> tags. Nothing private is stored here.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('video-covers', 'video-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Video covers are readable" ON storage.objects;
CREATE POLICY "Video covers are readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'video-covers');

-- Only admins and recording admins upload. The upload route checks the role
-- too, so this is defence in depth rather than the only gate.
DROP POLICY IF EXISTS "Content admins can upload video covers" ON storage.objects;
CREATE POLICY "Content admins can upload video covers" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'video-covers'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'recording_admin')
    )
  );

DROP POLICY IF EXISTS "Content admins can replace video covers" ON storage.objects;
CREATE POLICY "Content admins can replace video covers" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'video-covers'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'recording_admin')
    )
  );

DROP POLICY IF EXISTS "Content admins can delete video covers" ON storage.objects;
CREATE POLICY "Content admins can delete video covers" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'video-covers'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'recording_admin')
    )
  );
