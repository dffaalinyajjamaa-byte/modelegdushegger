-- Create video_progress table to track video playback position and completion
CREATE TABLE IF NOT EXISTS public.video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  playback_time NUMERIC DEFAULT 0,
  total_duration NUMERIC,
  percentage_watched INTEGER DEFAULT 0 CHECK (percentage_watched >= 0 AND percentage_watched <= 100),
  completed BOOLEAN DEFAULT false,
  points_awarded BOOLEAN DEFAULT false,
  last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Create index for fast queries
CREATE INDEX IF NOT EXISTS idx_video_progress_user_id ON public.video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_content_id ON public.video_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_completed ON public.video_progress(completed);

-- Enable RLS
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_progress
CREATE POLICY "Users can view own video progress"
  ON public.video_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own video progress"
  ON public.video_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video progress"
  ON public.video_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create live_teacher_sessions table to save conversation history
CREATE TABLE IF NOT EXISTS public.live_teacher_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  language TEXT DEFAULT 'oromo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast queries
CREATE INDEX IF NOT EXISTS idx_live_teacher_sessions_user_id ON public.live_teacher_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_teacher_sessions_created_at ON public.live_teacher_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE public.live_teacher_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_teacher_sessions
CREATE POLICY "Users can view own sessions"
  ON public.live_teacher_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.live_teacher_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.live_teacher_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.live_teacher_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update session timestamp
CREATE OR REPLACE FUNCTION public.update_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_live_teacher_sessions_updated_at
  BEFORE UPDATE ON public.live_teacher_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_updated_at();