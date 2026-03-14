-- =============================================
-- PROFILES (extends Supabase Auth users)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  business_name TEXT,
  industry TEXT,
  city TEXT,
  bio TEXT,
  gstin TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTIONS
-- =============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  razorpay_payment_id TEXT NOT NULL,
  razorpay_order_id TEXT,
  plan_name TEXT NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_expires ON subscriptions(user_id, expires_at DESC);

-- =============================================
-- RESOURCES (Cheat Sheets, Templates)
-- =============================================
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cheat_sheet', 'template')),
  file_url TEXT,
  external_url TEXT,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- VIDEO SUMMARIES
-- =============================================
CREATE TABLE video_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  youtube_video_id TEXT,
  category TEXT NOT NULL,
  video_duration_minutes INTEGER,
  read_time_minutes INTEGER,
  one_line_takeaway TEXT,
  key_points JSONB,
  action_items JSONB,
  full_summary TEXT,
  view_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POSTS (Community)
-- =============================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('win', 'question', 'discussion')),
  is_pinned BOOLEAN DEFAULT false,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_category ON posts(category);

-- =============================================
-- COMMENTS
-- =============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at);

-- =============================================
-- LIKES
-- =============================================
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_likes_post ON likes(post_id);

-- =============================================
-- SAVED POSTS (Bookmarks)
-- =============================================
CREATE TABLE saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- =============================================
-- CATEGORIES (for content organization)
-- =============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed categories
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Growth Strategy', 'growth-strategy', 1),
  ('Marketing', 'marketing', 2),
  ('Operations', 'operations', 3),
  ('Finance', 'finance', 4),
  ('Pricing', 'pricing', 5),
  ('Hiring', 'hiring', 6),
  ('Sales', 'sales', 7),
  ('Customer Retention', 'customer-retention', 8);

-- =============================================
-- INVOICES (GST-compliant tax invoices)
-- =============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date TIMESTAMPTZ DEFAULT NOW(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_gstin TEXT,
  customer_business_name TEXT,
  customer_address TEXT,
  customer_state TEXT,
  description TEXT NOT NULL,
  sac_code TEXT NOT NULL DEFAULT '998314',
  base_amount INTEGER NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 18.00,
  cgst_amount INTEGER NOT NULL,
  sgst_amount INTEGER NOT NULL,
  igst_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- =============================================
-- ADMIN SETTINGS (company details for invoices, etc.)
-- =============================================
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed admin settings for invoice generation
INSERT INTO admin_settings (key, value) VALUES
  ('company_gstin', ''),
  ('company_legal_name', ''),
  ('company_address', ''),
  ('company_state', ''),
  ('company_state_code', ''),
  ('gst_rate', '18'),
  ('sac_code', '998314'),
  ('invoice_prefix', 'FY26');
