-- =============================================
-- PHASE 8: SUBSCRIPTION ONBOARDING SYSTEM
-- =============================================

-- =============================================
-- 1. ALTER EXISTING TABLES
-- =============================================

-- Profiles: track whether user has set their password
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT NULL;

-- Backfill existing users — they already have passwords
UPDATE profiles SET password_set = true WHERE password_set IS NULL;

-- Subscriptions: make razorpay_payment_id nullable (recurring subs won't have one)
ALTER TABLE subscriptions ALTER COLUMN razorpay_payment_id DROP NOT NULL;

-- Subscriptions: add recurring subscription fields
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS recurring_status TEXT
  CHECK (recurring_status IN ('active', 'paused', 'cancelled', 'completed'));
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_label TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS base_amount_paise INTEGER;

-- Unique constraint on razorpay_payment_id to prevent race condition duplicates
-- (partial — only where not null, since recurring subs won't have one)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_razorpay_payment_id
  ON subscriptions(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

-- Prevent multiple active subscriptions per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_sub_per_user
  ON subscriptions(user_id) WHERE status = 'active';

-- Index for looking up subscriptions by razorpay_subscription_id
CREATE INDEX IF NOT EXISTS idx_sub_rzp_subscription
  ON subscriptions(razorpay_subscription_id) WHERE razorpay_subscription_id IS NOT NULL;

-- =============================================
-- 2. ONBOARDING SESSIONS
-- =============================================

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  plan_id TEXT NOT NULL DEFAULT 'monthly',
  razorpay_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'payment_pending', 'paid', 'user_created', 'completed', 'expired', 'failed')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_email ON onboarding_sessions(email);
CREATE INDEX IF NOT EXISTS idx_onboarding_rzp_sub ON onboarding_sessions(razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboarding_sessions(status);

ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
-- No user-level policies — accessed only via service role in API routes

-- =============================================
-- 3. MAGIC LOGIN TOKENS
-- =============================================

CREATE TABLE IF NOT EXISTS magic_login_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_tokens_hash ON magic_login_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_user ON magic_login_tokens(user_id);

ALTER TABLE magic_login_tokens ENABLE ROW LEVEL SECURITY;
-- No user-level policies — accessed only via service role in API routes

-- =============================================
-- 4. WEBHOOK EVENTS (idempotency log)
-- =============================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  razorpay_event_id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON webhook_events(razorpay_event_id);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
-- No user-level policies — accessed only via service role in API routes

-- =============================================
-- 5. UPDATE AUTH TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, password_set)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'password_set')::boolean, true)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
