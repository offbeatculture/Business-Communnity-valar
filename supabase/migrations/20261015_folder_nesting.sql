-- =============================================================================
-- Nested folders in the Breathwork Library
-- =============================================================================
-- Folders were flat: every folder sat at the top of the library. This lets a
-- folder live inside another one ("2026" > "June Recordings"), so admins can
-- group monthly folders without the top level growing forever.
--
-- parent_id NULL means "top level". Recordings keep pointing at exactly one
-- folder through video_summaries.folder_id; nothing about that changes.
--
-- Idempotent — safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Column
-- -----------------------------------------------------------------------------
-- ON DELETE RESTRICT, not SET NULL or CASCADE: deleting a parent should never
-- silently promote its children to the top level or take them with it. The
-- API refuses first with a readable message; this is the backstop.

ALTER TABLE content_folders
  ADD COLUMN IF NOT EXISTS parent_id uuid
  REFERENCES content_folders(id) ON DELETE RESTRICT;

COMMENT ON COLUMN content_folders.parent_id IS
  'The folder this one sits inside. NULL = top level of the library.';

CREATE INDEX IF NOT EXISTS content_folders_parent_idx
  ON content_folders (parent_id);

-- A folder cannot be its own parent.
ALTER TABLE content_folders
  DROP CONSTRAINT IF EXISTS content_folders_not_own_parent;

ALTER TABLE content_folders
  ADD CONSTRAINT content_folders_not_own_parent
  CHECK (parent_id IS NULL OR parent_id <> id);

-- -----------------------------------------------------------------------------
-- 2. No cycles
-- -----------------------------------------------------------------------------
-- The CHECK above only catches A -> A. Moving A into its own grandchild
-- (A -> C where C is already inside A) would make A and C each other's
-- ancestors, and both would vanish from the library because neither is
-- reachable from the top. Walk up from the new parent; if we meet the folder
-- being moved, refuse.

CREATE OR REPLACE FUNCTION content_folders_prevent_cycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cursor_id uuid := NEW.parent_id;
  depth     int  := 0;
BEGIN
  WHILE cursor_id IS NOT NULL LOOP
    IF cursor_id = NEW.id THEN
      RAISE EXCEPTION 'A folder cannot be moved inside itself or one of its own subfolders'
        USING ERRCODE = 'check_violation';
    END IF;

    depth := depth + 1;
    IF depth > 50 THEN
      RAISE EXCEPTION 'Folder nesting is too deep'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT parent_id INTO cursor_id FROM content_folders WHERE id = cursor_id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_folders_prevent_cycle ON content_folders;

CREATE TRIGGER content_folders_prevent_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON content_folders
  FOR EACH ROW
  WHEN (NEW.parent_id IS NOT NULL)
  EXECUTE FUNCTION content_folders_prevent_cycle();

COMMIT;


-- Check: every existing folder starts at the top level.
SELECT name, parent_id, sort_order
FROM   content_folders
ORDER  BY sort_order, created_at DESC;
