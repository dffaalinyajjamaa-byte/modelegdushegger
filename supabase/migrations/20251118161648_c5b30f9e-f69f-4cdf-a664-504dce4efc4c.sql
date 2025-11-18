-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('chat-files', 'chat-files', false),
  ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars bucket policies (public read, authenticated users can upload own)
CREATE POLICY "Public avatar access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Chat files policies (authenticated users can access their chat files)
CREATE POLICY "Authenticated users can view their chat files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-files' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can upload chat files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-files' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete their chat files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-files' AND
    auth.role() = 'authenticated'
  );

-- Media bucket policies (public read, authenticated write)
CREATE POLICY "Public media access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete their media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media' AND
    auth.role() = 'authenticated'
  );

-- Add bio and last_seen columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_seen = NOW()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update last_seen on activity
DROP TRIGGER IF EXISTS update_last_seen_trigger ON activities;
CREATE TRIGGER update_last_seen_trigger
AFTER INSERT ON activities
FOR EACH ROW
EXECUTE FUNCTION update_user_last_seen();