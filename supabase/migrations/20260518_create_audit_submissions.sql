-- ════════════════════════════════════════════════════════════
-- 7 Forces Business Audit — submissions table (MVP)
-- ════════════════════════════════════════════════════════════
-- Stores one row per audit form submission. No auth required —
-- anonymous owners can submit; user_id is filled later when the
-- account is created. Identity block + 16 question answers live
-- here as the source of truth for the (eventual) verdict engine
-- and report renderer. RLS is restrictive; writes go through the
-- API route which uses the service-role admin client.
-- ════════════════════════════════════════════════════════════

CREATE TABLE audit_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity block (captured before the diagnostic questions)
  full_name       text NOT NULL,
  business_name   text NOT NULL,
  phone           text NOT NULL,
  email           text NOT NULL,
  city            text,
  vertical        text NOT NULL,

  -- The 16 diagnostic answers as JSONB:
  --   { "q1_icp_clarity": { "value": "...", "score": 4 },
  --     "q3_top3_concentration": { "value": 55, "unit": "%", "confidence": "approx" },
  --     ... }
  answers         jsonb NOT NULL DEFAULT '{}',

  -- Lifecycle
  status          text NOT NULL DEFAULT 'submitted'
                  CHECK (status IN ('in_progress', 'submitted')),
  started_at      timestamptz NOT NULL DEFAULT now(),
  submitted_at    timestamptz,

  -- Reserved for future: link to auth.users when we add accounts
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Phone is the resume key. Index for lookup on returning visitors.
CREATE INDEX idx_audit_submissions_phone ON audit_submissions (phone, submitted_at DESC);

-- For admin views: most recent first.
CREATE INDEX idx_audit_submissions_submitted_at ON audit_submissions (submitted_at DESC)
  WHERE status = 'submitted';

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_audit_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_submissions_updated_at
  BEFORE UPDATE ON audit_submissions
  FOR EACH ROW EXECUTE FUNCTION update_audit_submissions_updated_at();

-- RLS: only service role writes/reads via API. No anon policies.
-- The API route at /api/audit/submit uses createAdminClient() so RLS is bypassed.
ALTER TABLE audit_submissions ENABLE ROW LEVEL SECURITY;

-- Admins (role='admin' in profiles) can read all submissions for review/debug.
CREATE POLICY "Admins read all audit submissions"
  ON audit_submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
