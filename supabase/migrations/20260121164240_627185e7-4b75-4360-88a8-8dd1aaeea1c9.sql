-- 1. PDF Uploads for music generation
CREATE TABLE public.study_music_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  subject TEXT,
  grade TEXT,
  extracted_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Generated Lyrics
CREATE TABLE public.study_music_lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.study_music_uploads(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('om', 'am', 'en')),
  lyrics_text TEXT NOT NULL,
  generated_by TEXT DEFAULT 'gemini',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Generated Music Tracks
CREATE TABLE public.study_music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lyrics_id UUID NOT NULL REFERENCES public.study_music_lyrics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  music_style TEXT NOT NULL,
  audio_url TEXT,
  task_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  duration_seconds INTEGER,
  title TEXT,
  subject TEXT,
  grade TEXT,
  times_played INTEGER DEFAULT 0,
  total_listen_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. AI Study Suggestions
CREATE TABLE public.study_music_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.study_music_tracks(id) ON DELETE CASCADE,
  best_listening_time TEXT,
  recommended_repeats INTEGER,
  memory_tip TEXT,
  quiz_suggestion TEXT,
  next_action TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for all tables
ALTER TABLE public.study_music_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_music_lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_music_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_music_uploads
CREATE POLICY "Users can create own uploads" ON public.study_music_uploads
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own uploads" ON public.study_music_uploads
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads" ON public.study_music_uploads
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploads" ON public.study_music_uploads
FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for study_music_lyrics
CREATE POLICY "Users can create lyrics for own uploads" ON public.study_music_lyrics
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.study_music_uploads WHERE id = upload_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view lyrics for own uploads" ON public.study_music_lyrics
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.study_music_uploads WHERE id = upload_id AND user_id = auth.uid())
);

-- RLS Policies for study_music_tracks
CREATE POLICY "Users can create own tracks" ON public.study_music_tracks
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tracks" ON public.study_music_tracks
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tracks" ON public.study_music_tracks
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all tracks" ON public.study_music_tracks
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'teacher')
);

-- RLS Policies for study_music_suggestions
CREATE POLICY "Users can view suggestions for own tracks" ON public.study_music_suggestions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.study_music_tracks WHERE id = track_id AND user_id = auth.uid())
);

CREATE POLICY "System can insert suggestions" ON public.study_music_suggestions
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.study_music_tracks WHERE id = track_id AND user_id = auth.uid())
);

-- Create storage bucket for study music PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('study-music-pdfs', 'study-music-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for study music PDFs
CREATE POLICY "Users can upload own PDFs" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'study-music-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own PDFs" ON storage.objects
FOR SELECT USING (bucket_id = 'study-music-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own PDFs" ON storage.objects
FOR DELETE USING (bucket_id = 'study-music-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);