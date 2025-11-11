-- Add exams_taken to daily_stats
ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS exams_taken INTEGER DEFAULT 0;

-- Update existing increment_daily_stat function to support exams
CREATE OR REPLACE FUNCTION public.increment_daily_stat(p_user_id uuid, p_stat_type text, p_increment integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.daily_stats (user_id, date, tasks_completed, videos_watched, materials_read, ai_interactions, exams_taken)
  VALUES (
    p_user_id,
    CURRENT_DATE,
    CASE WHEN p_stat_type = 'tasks' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'videos' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'materials' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'ai' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'exams' THEN p_increment ELSE 0 END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    tasks_completed = CASE WHEN p_stat_type = 'tasks' THEN daily_stats.tasks_completed + p_increment ELSE daily_stats.tasks_completed END,
    videos_watched = CASE WHEN p_stat_type = 'videos' THEN daily_stats.videos_watched + p_increment ELSE daily_stats.videos_watched END,
    materials_read = CASE WHEN p_stat_type = 'materials' THEN daily_stats.materials_read + p_increment ELSE daily_stats.materials_read END,
    ai_interactions = CASE WHEN p_stat_type = 'ai' THEN daily_stats.ai_interactions + p_increment ELSE daily_stats.ai_interactions END,
    exams_taken = CASE WHEN p_stat_type = 'exams' THEN daily_stats.exams_taken + p_increment ELSE daily_stats.exams_taken END;
END;
$function$;

-- Add group chat fields to chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS group_avatar_url TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS admins UUID[] DEFAULT ARRAY[]::UUID[];

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'text')),
  content_url TEXT,
  text_content TEXT,
  background_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stories from their contacts"
ON stories FOR SELECT
USING (
  auth.uid() = user_id OR
  auth.uid() IN (
    SELECT DISTINCT unnest(members)::uuid
    FROM chats
    WHERE (auth.uid())::text = ANY(members)
  )
);

CREATE POLICY "Users can create their own stories"
ON stories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
ON stories FOR DELETE
USING (auth.uid() = user_id);

-- Create story views table
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view story views for their own stories"
ON story_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_views.story_id
    AND stories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create story views"
ON story_views FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admins UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  subscribers UUID[] DEFAULT ARRAY[]::UUID[],
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public channels are viewable by everyone"
ON channels FOR SELECT
USING (is_public = true OR (auth.uid())::uuid = ANY(subscribers) OR (auth.uid())::uuid = ANY(admins));

CREATE POLICY "Users can create channels"
ON channels FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Channel admins can update channels"
ON channels FOR UPDATE
USING ((auth.uid())::uuid = ANY(admins));

-- Create channel posts table
CREATE TABLE IF NOT EXISTS channel_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  views INTEGER DEFAULT 0,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE channel_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view posts from subscribed channels"
ON channel_posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channels
    WHERE channels.id = channel_posts.channel_id
    AND (channels.is_public = true OR (auth.uid())::uuid = ANY(channels.subscribers))
  )
);

CREATE POLICY "Channel admins can create posts"
ON channel_posts FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM channels
    WHERE channels.id = channel_posts.channel_id
    AND (auth.uid())::uuid = ANY(channels.admins)
  )
);

CREATE POLICY "Channel admins can update their posts"
ON channel_posts FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Channel admins can delete their posts"
ON channel_posts FOR DELETE
USING (auth.uid() = author_id);

-- Add time_taken to exam_submissions
ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS time_taken INTEGER;
ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS questions_correct INTEGER;
ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS questions_wrong INTEGER;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_public ON channels(is_public);
CREATE INDEX IF NOT EXISTS idx_channel_posts_channel ON channel_posts(channel_id);

-- Add trigger for channel updated_at
CREATE OR REPLACE FUNCTION update_channel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_channel_updated_at
BEFORE UPDATE ON channels
FOR EACH ROW
EXECUTE FUNCTION update_channel_updated_at();