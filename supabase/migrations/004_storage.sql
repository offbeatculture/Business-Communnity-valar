-- =============================================
-- STORAGE BUCKETS AND POLICIES
-- =============================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

-- Resources: authenticated can read, service role uploads
CREATE POLICY "Authenticated users can read resources" ON storage.objects
  FOR SELECT USING (bucket_id = 'resources' AND auth.role() = 'authenticated');

-- Avatars: authenticated can read, users upload to own folder
CREATE POLICY "Authenticated users can read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Invoices: users can read own folder, service role uploads
CREATE POLICY "Users can read own invoices" ON storage.objects
  FOR SELECT USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
