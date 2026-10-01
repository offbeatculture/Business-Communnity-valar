-- =============================================================================
-- Folder ordering in the library
-- =============================================================================
-- Folders were listed newest-created first, with no way to pin one to the top.
-- This adds an explicit order so a collection like the Sunday sessions can lead
-- the library without depending on when it happened to be created.
--
-- Lower sorts first. Everything defaults to 0, so folders that nobody has
-- ordered keep falling back to newest-first among themselves.
--
-- Idempotent — safe to re-run.
-- =============================================================================

BEGIN;

ALTER TABLE content_folders
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN content_folders.sort_order IS
  'Library ordering. Lower sorts first; ties break on created_at descending. '
  'Use a negative value to pin a folder above everything else.';

CREATE INDEX IF NOT EXISTS content_folders_sort_idx
  ON content_folders (sort_order, created_at DESC);

COMMIT;


-- -----------------------------------------------------------------------------
-- Pin the Sunday sessions to the top of the library.
-- -----------------------------------------------------------------------------
-- Matches on name, so it is a no-op if the folder has since been renamed.
-- You can change this any time from the Order field in the admin Folders panel.

UPDATE content_folders
SET    sort_order = -1
WHERE  name ILIKE 'Sunday Live%Lifinity';


-- Check: expect the Sunday folder first.
SELECT name, sort_order, created_at
FROM   content_folders
ORDER  BY sort_order ASC, created_at DESC;
