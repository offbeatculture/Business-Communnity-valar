-- ══════════════════════════════════════════════════════════════
-- Admin member management
--
-- Ported from the EIC console. Two pieces:
--   1. admin_actions — an audit trail for anything an admin does TO a
--      member (extending access, revoking it, resending a login).
--   2. Email helpers — emails live in auth.users, not public.profiles,
--      so admin search could never match one and the detail page could
--      never show one.
-- ══════════════════════════════════════════════════════════════

-- ── Audit trail ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),

  -- Who performed it.
  admin_user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email       text,

  -- Who it was performed on.
  target_user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_profile_id uuid,

  -- Machine-readable key: 'extend_subscription', 'revoke_access',
  -- 'resend_login', 'create_member'.
  action            text        NOT NULL,

  -- Structured context (days, old/new expiry, email).
  detail            jsonb,

  -- Optional free-text note from the admin.
  note              text
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_target
  ON public.admin_actions (target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created
  ON public.admin_actions (created_at DESC);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- No policy at all: the audit trail is written and read only through the
-- service role. A member must never be able to read what was done to
-- them here, and an admin must not be able to edit the record.

-- ── Email helpers ────────────────────────────────────────────
-- All SECURITY DEFINER so they can read auth.users, and all revoked from
-- anon/authenticated — exposing any of them would let a client enumerate
-- which email addresses have accounts.

-- Exact match. Used when creating a member, to detect an existing account
-- before trying to make a duplicate.
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  ORDER BY created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_id_by_email(text)
  FROM public, anon, authenticated;

-- Partial, case-insensitive match, to widen the admin member search.
CREATE OR REPLACE FUNCTION public.search_user_ids_by_email(
  p_query text,
  p_limit int DEFAULT 200
)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT id
  FROM auth.users
  WHERE p_query IS NOT NULL
    AND length(trim(p_query)) > 0
    AND email ILIKE '%' || trim(p_query) || '%'
  ORDER BY created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

REVOKE ALL ON FUNCTION public.search_user_ids_by_email(text, int)
  FROM public, anon, authenticated;

-- Batch lookup so a members list can show the address it matched on
-- without one round trip per row.
CREATE OR REPLACE FUNCTION public.get_emails_by_user_ids(p_ids uuid[])
RETURNS TABLE (user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT id, email::text
  FROM auth.users
  WHERE id = ANY(p_ids);
$$;

REVOKE ALL ON FUNCTION public.get_emails_by_user_ids(uuid[])
  FROM public, anon, authenticated;
