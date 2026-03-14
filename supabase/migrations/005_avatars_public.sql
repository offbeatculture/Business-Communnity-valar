-- Make the avatars bucket public so avatar URLs can be served directly
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
