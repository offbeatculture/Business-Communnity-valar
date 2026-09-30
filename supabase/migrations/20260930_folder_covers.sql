-- =============================================================================
-- Folder cover images
-- =============================================================================
-- Folders in the Breathwork Library currently render a generic folder glyph.
-- This adds an optional cover image per folder, plus a public storage bucket to
-- hold uploaded covers.
--
-- The bucket is public because covers are decorative artwork rendered in <img>
-- tags across the library — same reasoning as the avatars bucket in
-- 005_avatars_public.sql. Nothing private is ever stored here.
--
-- Idempotent — safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Column
-- -----------------------------------------------------------------------------

ALTER TABLE content_folders
  ADD COLUMN IF NOT EXISTS cover_image_url text;

COMMENT ON COLUMN content_folders.cover_image_url IS
  'Optional cover artwork for the folder card and the folder player header. '
  'Either an uploaded file in the folder-covers bucket or an external URL. '
  'Null falls back to the first recording''s YouTube thumbnail.';

COMMIT;


-- =============================================================================
-- 2. Storage bucket
-- =============================================================================
-- Kept outside the transaction above: on a re-run the INSERT is a no-op via
-- ON CONFLICT, and the policies are dropped and recreated.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('folder-covers', 'folder-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone can read a cover (the bucket is public; this makes the intent explicit).
DROP POLICY IF EXISTS "Folder covers are readable" ON storage.objects;
CREATE POLICY "Folder covers are readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'folder-covers');

-- Only admins and recording admins upload or replace covers. The upload route
-- also checks the role, so this is defence in depth rather than the only gate.
DROP POLICY IF EXISTS "Content admins can upload folder covers" ON storage.objects;
CREATE POLICY "Content admins can upload folder covers" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'folder-covers'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'recording_admin')
    )
  );

DROP POLICY IF EXISTS "Content admins can replace folder covers" ON storage.objects;
CREATE POLICY "Content admins can replace folder covers" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'folder-covers'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'recording_admin')
    )
  );

DROP POLICY IF EXISTS "Content admins can delete folder covers" ON storage.objects;
CREATE POLICY "Content admins can delete folder covers" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'folder-covers'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'recording_admin')
    )
  );
