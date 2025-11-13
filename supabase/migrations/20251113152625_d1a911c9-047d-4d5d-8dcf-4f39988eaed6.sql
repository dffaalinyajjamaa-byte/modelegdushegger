-- Create book_progress table for reading tracker
CREATE TABLE IF NOT EXISTS public.book_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER,
  last_position TEXT,
  completion_percentage INTEGER DEFAULT 0,
  bookmarks JSONB DEFAULT '[]'::jsonb,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Enable RLS
ALTER TABLE public.book_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for book_progress
CREATE POLICY "Users can manage own progress" 
  ON public.book_progress FOR ALL 
  USING (auth.uid() = user_id);

-- Create book_ai_chats table for AI book helper
CREATE TABLE IF NOT EXISTS public.book_ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  page_number INTEGER,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.book_ai_chats ENABLE ROW LEVEL SECURITY;

-- RLS policies for book_ai_chats
CREATE POLICY "Users can view own book chats" 
  ON public.book_ai_chats FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own book chats" 
  ON public.book_ai_chats FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Add cover image columns to content table
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Generate thumbnails for existing Google Drive books
UPDATE public.content 
SET thumbnail_url = CONCAT(
  'https://drive.google.com/thumbnail?id=',
  SUBSTRING(url FROM 'file/d/([^/]+)/'),
  '&sz=w400'
)
WHERE type = 'pdf' 
  AND url LIKE '%drive.google.com%' 
  AND thumbnail_url IS NULL;

-- Create trigger for updating book_progress updated_at
CREATE OR REPLACE FUNCTION public.update_book_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_book_progress_timestamp
  BEFORE UPDATE ON public.book_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_book_progress_updated_at();