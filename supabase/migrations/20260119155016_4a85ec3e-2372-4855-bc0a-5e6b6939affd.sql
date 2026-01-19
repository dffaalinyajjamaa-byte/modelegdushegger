-- 1. Add student verification fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 2. Create content likes table
CREATE TABLE IF NOT EXISTS content_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_id, user_id)
);

-- Enable RLS on content_likes
ALTER TABLE content_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for content likes
CREATE POLICY "Users can like content" ON content_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view likes" ON content_likes
FOR SELECT USING (true);

CREATE POLICY "Users can unlike their own likes" ON content_likes
FOR DELETE USING (auth.uid() = user_id);

-- 3. Add realtime for content_likes
ALTER PUBLICATION supabase_realtime ADD TABLE content_likes;