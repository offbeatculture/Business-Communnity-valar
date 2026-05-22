-- ════════════════════════════════════════════════════════════
-- audit_submissions: email delivery tracking
-- ════════════════════════════════════════════════════════════
-- Tracks whether the PDF audit report email was successfully
-- sent to the founder. Updated by /api/audit/send-report.

ALTER TABLE audit_submissions
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_error text;

-- Operators can filter for unsent reports quickly.
CREATE INDEX IF NOT EXISTS idx_audit_submissions_email_sent
  ON audit_submissions (email_sent, submitted_at DESC)
  WHERE email_sent = false;
