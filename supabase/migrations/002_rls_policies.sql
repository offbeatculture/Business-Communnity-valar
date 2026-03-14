-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Profiles: anyone authenticated can read, users can update own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions: users can read own
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Resources: any authenticated user can read published
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published resources viewable" ON resources
  FOR SELECT USING (is_published = true AND auth.role() = 'authenticated');

-- Video Summaries: any authenticated user can read published
ALTER TABLE video_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published summaries viewable" ON video_summaries
  FOR SELECT USING (is_published = true AND auth.role() = 'authenticated');

-- Posts: authenticated can read, own can create/update/delete
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts viewable by authenticated" ON posts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by authenticated" ON comments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable" ON likes
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can toggle own likes" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own likes" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- Saved Posts
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own saves" ON saved_posts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create saves" ON saved_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete saves" ON saved_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by authenticated" ON categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Invoices: users can read own
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

-- Admin Settings: read-only for admin
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can read settings" ON admin_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
