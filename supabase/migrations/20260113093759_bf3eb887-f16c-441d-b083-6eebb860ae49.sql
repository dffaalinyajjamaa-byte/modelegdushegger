-- Create afoola_videos table for Oromo oral literature videos
CREATE TABLE public.afoola_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('walaloo', 'mammaaksa', 'geerarsa', 'hibboo', 'oduu_durii')),
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on afoola_videos
ALTER TABLE public.afoola_videos ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view afoola videos
CREATE POLICY "Afoola videos are viewable by authenticated users" 
ON public.afoola_videos 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create aadaa_videos table for Oromo cultural practice videos
CREATE TABLE public.aadaa_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('irreecha', 'nyaata', 'uffannaa', 'shubbisa')),
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on aadaa_videos
ALTER TABLE public.aadaa_videos ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view aadaa videos
CREATE POLICY "Aadaa videos are viewable by authenticated users" 
ON public.aadaa_videos 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add grade_level column to daily_challenges table
ALTER TABLE public.daily_challenges 
ADD COLUMN IF NOT EXISTS grade_level TEXT DEFAULT 'Grade 8';

-- Add signup_date and badge_tier columns to user_rankings table
ALTER TABLE public.user_rankings 
ADD COLUMN IF NOT EXISTS signup_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS badge_tier TEXT DEFAULT 'beginner' CHECK (badge_tier IN ('beginner', 'bronze', 'silver', 'metal_green', 'gold'));

-- Create function to update badge tier based on streak
CREATE OR REPLACE FUNCTION public.update_badge_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_streak >= 90 THEN
    NEW.badge_tier := 'gold';
  ELSIF NEW.current_streak >= 50 THEN
    NEW.badge_tier := 'metal_green';
  ELSIF NEW.current_streak >= 20 THEN
    NEW.badge_tier := 'silver';
  ELSIF NEW.current_streak >= 10 THEN
    NEW.badge_tier := 'bronze';
  ELSE
    NEW.badge_tier := 'beginner';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update badge tier
DROP TRIGGER IF EXISTS update_badge_tier_trigger ON public.user_rankings;
CREATE TRIGGER update_badge_tier_trigger
  BEFORE UPDATE ON public.user_rankings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_badge_tier();