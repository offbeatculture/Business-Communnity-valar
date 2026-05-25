-- ════════════════════════════════════════════════════════════
-- Long-form founder assessment — Phase 1 schema
-- ════════════════════════════════════════════════════════════
-- Adds invite-only entry, report draft lifecycle, and discriminates
-- public audit submissions from invite-only assessment submissions.
--
-- Phase 2-5 will extend further (jobs table for the Claude worker,
-- prompt_version columns on drafts, CSV invite source, etc.).

-- ─── 1. assessment_invites ─────────────────────────────────

CREATE TABLE assessment_invites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Magic-link token. Stored as a hash (sha256 hex) to avoid leaking
  -- on a DB dump. The plaintext token is only ever returned once
  -- (at issue time) via the /api/admin/invites response.
  token_hash    text NOT NULL UNIQUE,

  -- Founder identity captured at issue time.
  email         text NOT NULL,
  full_name     text NOT NULL,
  phone         text,
  vertical      text,

  -- Lifecycle (must match AssessmentInviteStatus in types/assessment.ts)
  status        text NOT NULL DEFAULT 'issued'
                CHECK (status IN ('issued','opened','in_progress','submitted','expired','revoked')),

  -- When the invite was opened (first magic-link click).
  opened_at     timestamptz,

  -- When it was consumed (founder explicitly clicked Start, creating
  -- the audit_submissions row). At consumption, submission_id is set.
  consumed_at   timestamptz,
  submission_id uuid REFERENCES audit_submissions(id) ON DELETE SET NULL,

  -- Optional expiry. Issued invites past this are auto-expired by the
  -- /resolve endpoint (no cron needed — checked on read).
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '30 days'),

  -- Admin attribution.
  issued_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes         text,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessment_invites_token_hash ON assessment_invites (token_hash);
CREATE INDEX idx_assessment_invites_status ON assessment_invites (status, created_at DESC);
CREATE INDEX idx_assessment_invites_email ON assessment_invites (email);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_assessment_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assessment_invites_updated_at
  BEFORE UPDATE ON assessment_invites
  FOR EACH ROW EXECUTE FUNCTION update_assessment_invites_updated_at();

ALTER TABLE assessment_invites ENABLE ROW LEVEL SECURITY;

-- Admins can read all. Writes go through API (admin client).
CREATE POLICY "Admins read all assessment invites"
  ON assessment_invites FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ─── 2. audit_submissions extensions ───────────────────────

-- Discriminate public audit submissions from invite-only ones.
-- Existing rows default to 'public_audit' which preserves current
-- behaviour for the existing audit flow (no changes to /api/audit/submit).
ALTER TABLE audit_submissions
  ADD COLUMN IF NOT EXISTS submission_kind text NOT NULL DEFAULT 'public_audit'
    CHECK (submission_kind IN ('public_audit','invite_assessment')),
  ADD COLUMN IF NOT EXISTS invite_id uuid REFERENCES assessment_invites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_status text NOT NULL DEFAULT 'awaiting_generation'
    CHECK (report_status IN ('awaiting_generation','generating','awaiting_approval','approved','rejected','sent','failed')),
  ADD COLUMN IF NOT EXISTS report_status_changed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_audit_submissions_report_status
  ON audit_submissions (report_status, submitted_at DESC)
  WHERE submission_kind = 'invite_assessment';

-- ─── 3. report_drafts ──────────────────────────────────────

CREATE TABLE report_drafts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   uuid NOT NULL REFERENCES audit_submissions(id) ON DELETE CASCADE,

  -- Monotonic version per submission. v1 is the first draft.
  -- When a draft is rejected and regenerated, v2 is created and v1
  -- is marked 'superseded'.
  version         int NOT NULL DEFAULT 1,

  -- Lifecycle (must match ReportDraftStatus in types/assessment.ts)
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','approved','rejected','superseded')),

  -- The structured report payload. Phase 1 conforms to StubReportPayload.
  -- Phase 3 conforms to the full ReportPayloadSchema (Zod-validated at
  -- /api/worker/jobs/[id]/complete).
  payload         jsonb NOT NULL,

  -- Which engine produced this draft.
  generator       text NOT NULL DEFAULT 'stub'
                  CHECK (generator IN ('stub','claude-cli','anthropic-api')),
  generator_meta  jsonb,

  -- Review trail
  reviewer_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  review_note     text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (submission_id, version)
);

CREATE INDEX idx_report_drafts_status ON report_drafts (status, created_at DESC);
CREATE INDEX idx_report_drafts_submission ON report_drafts (submission_id, version DESC);
CREATE INDEX idx_report_drafts_pending_review
  ON report_drafts (created_at ASC)
  WHERE status = 'draft';

CREATE OR REPLACE FUNCTION update_report_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_drafts_updated_at
  BEFORE UPDATE ON report_drafts
  FOR EACH ROW EXECUTE FUNCTION update_report_drafts_updated_at();

ALTER TABLE report_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all report drafts"
  ON report_drafts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ─── 4. Notes ──────────────────────────────────────────────
--
-- - All writes happen via the admin client (service role) from API
--   routes. Anon writes are not policy-allowed.
-- - The expires_at default of 30 days matches the onboarding magic-link
--   posture; tune later if needed.
-- - report_status_changed_at is updated by the application layer when
--   it transitions report_status. No trigger — explicit is clearer.
