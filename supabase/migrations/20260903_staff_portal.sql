-- ══════════════════════════════════════════════════════════════
-- Staff portal
--
-- Adds a role between member and admin. Staff run support end-to-end:
-- they see members and support in full, but not revenue, and they cannot
-- delete anything permanently.
--
-- Adapted from the EIC portal. The difference that matters: this app
-- already has a 'recording_admin' role, so the new CHECK must keep it or
-- every recording uploader loses access the moment this runs.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Role ──────────────────────────────────────────────────
-- The CHECK is unnamed in 001_initial_schema, and its generated name can
-- differ between environments, so find it rather than guess.
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT con.conname INTO v_constraint
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'profiles'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%role%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

-- 'recording_admin' is carried over deliberately: it is already in use.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('member', 'staff', 'recording_admin', 'admin'));

-- ── 2. Follow-up list ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who the follow-up is about. Cascade: with the member gone the task is
  -- meaningless, and keeping it would show a blank row forever.
  member_user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  reason         text        NOT NULL,

  is_completed   boolean     NOT NULL DEFAULT false,
  completed_at   timestamptz,
  completed_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- SET NULL, not CASCADE: who raised a follow-up should survive the staff
  -- account being removed.
  created_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_tasks_open
  ON public.staff_tasks (is_completed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_tasks_member
  ON public.staff_tasks (member_user_id);

-- is_completed and completed_at must never disagree. A "done" row with no
-- timestamp, or an open row carrying one, makes the list unsortable.
CREATE OR REPLACE FUNCTION public.trg_staff_tasks_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();

  IF NEW.is_completed AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  ELSIF NOT NEW.is_completed THEN
    NEW.completed_at := NULL;
    NEW.completed_by := NULL;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS staff_tasks_sync ON public.staff_tasks;
CREATE TRIGGER staff_tasks_sync
  BEFORE INSERT OR UPDATE ON public.staff_tasks
  FOR EACH ROW EXECUTE FUNCTION public.trg_staff_tasks_sync();

ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;

-- No policies: every read and write goes through the service-role client in
-- route handlers that check the caller's role first. Same shape as the rest
-- of the admin surface, and it keeps the task list off the public API.

-- ── 3. Sign-in activity ──────────────────────────────────────
-- last_sign_in_at lives in auth.users, which the API cannot read directly.
--
-- Worth knowing when reading the output: last_sign_in_at only moves on an
-- actual sign-in. Someone browsing daily on a long-lived session still looks
-- stale here, so this is "has not re-authenticated", NOT "has not visited".
CREATE OR REPLACE FUNCTION public.get_users_inactive_since(p_days int DEFAULT 7)
RETURNS TABLE (user_id uuid, email text, last_sign_in_at timestamptz, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT u.id, u.email::text, u.last_sign_in_at, u.created_at
  FROM auth.users u
  WHERE u.deleted_at IS NULL
    AND (
      u.last_sign_in_at IS NULL
      OR u.last_sign_in_at < now() - make_interval(days => greatest(coalesce(p_days, 7), 1))
    )
  ORDER BY u.last_sign_in_at ASC NULLS FIRST;
$$;

REVOKE ALL ON FUNCTION public.get_users_inactive_since(int)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_inactive_since(int) TO service_role;
