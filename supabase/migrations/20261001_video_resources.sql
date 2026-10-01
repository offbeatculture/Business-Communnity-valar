-- =============================================================================
-- Downloadable resources attached to a recording
-- =============================================================================
-- Resources (worksheets, guides, slides) could only hang off a `resources` row
-- via resource_documents. A session recording had nowhere to put its handout.
--
-- This mirrors resource_documents, pointed at video_summaries instead. Files
-- live in the existing private `resources` bucket and are served through
-- /api/content/[id]/resource/[resourceId], which checks the member is signed in
-- before handing over a short-lived signed URL.
--
-- Idempotent — safe to re-run.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS video_resources (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id       uuid NOT NULL REFERENCES video_summaries(id) ON DELETE CASCADE,
  label          text NOT NULL,
  -- Path inside the `resources` storage bucket, not a public URL.
  file_url       text NOT NULL,
  sort_order     integer NOT NULL DEFAULT 0,
  download_count integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE video_resources IS
  'Downloadable files attached to a recording. Same shape as '
  'resource_documents, but keyed to video_summaries.';

COMMENT ON COLUMN video_resources.file_url IS
  'Object path within the private `resources` bucket. Never a public URL — '
  'downloads go through the API so membership can be checked first.';

CREATE INDEX IF NOT EXISTS video_resources_video_idx
  ON video_resources (video_id, sort_order);


-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
-- Matches resource_documents: any signed-in member can see that a resource
-- exists, and only the service role writes. The admin API uses the service
-- role, and the download route checks auth before signing a URL.
-- -----------------------------------------------------------------------------

ALTER TABLE video_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view video resources" ON video_resources;
CREATE POLICY "Authenticated users can view video resources"
  ON video_resources FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role can manage video resources" ON video_resources;
CREATE POLICY "Service role can manage video resources"
  ON video_resources FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;


-- Check: expect the table with no rows yet.
SELECT count(*) AS video_resource_rows FROM video_resources;
