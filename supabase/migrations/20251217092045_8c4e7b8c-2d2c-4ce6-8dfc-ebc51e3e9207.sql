-- Create relax_time_videos table for RELAX TIME feature
CREATE TABLE public.relax_time_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL CHECK (language IN ('afaan_oromoo', 'english', 'amharic')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relax_time_videos ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view videos
CREATE POLICY "Relax time videos are viewable by authenticated users"
  ON public.relax_time_videos
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX idx_relax_time_videos_language_category ON public.relax_time_videos(language, category);

-- Insert some sample videos (you can add real YouTube links later)
INSERT INTO public.relax_time_videos (language, category, title, youtube_url, display_order) VALUES
-- Afaan Oromoo
('afaan_oromoo', 'history_country', 'Seenaa Oromiyaa', 'https://www.youtube.com/watch?v=sample1', 1),
('afaan_oromoo', 'history_heroes', 'Gootota Oromoo', 'https://www.youtube.com/watch?v=sample2', 1),
('afaan_oromoo', 'history_gada', 'Sirna Gadaa', 'https://www.youtube.com/watch?v=sample3', 1),
('afaan_oromoo', 'fairy_tales', 'Oduu Durii', 'https://www.youtube.com/watch?v=sample4', 1),
-- English
('english', 'history_country', 'History of Ethiopia', 'https://www.youtube.com/watch?v=sample5', 1),
('english', 'history_heroes', 'Ethiopian Heroes', 'https://www.youtube.com/watch?v=sample6', 1),
('english', 'life_teaching', 'Life Lessons', 'https://www.youtube.com/watch?v=sample7', 1),
('english', 'fairy_tales', 'African Fairy Tales', 'https://www.youtube.com/watch?v=sample8', 1),
-- Amharic
('amharic', 'history_country', 'የኢትዮጵያ ታሪክ', 'https://www.youtube.com/watch?v=sample9', 1),
('amharic', 'history_heroes', 'የጀግኖች ታሪክ', 'https://www.youtube.com/watch?v=sample10', 1),
('amharic', 'fairy_tales', 'ተረቶች', 'https://www.youtube.com/watch?v=sample11', 1);