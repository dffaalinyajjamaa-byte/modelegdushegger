-- Create daily_stats table for progress tracking
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks_completed INTEGER DEFAULT 0,
  videos_watched INTEGER DEFAULT 0,
  materials_read INTEGER DEFAULT 0,
  ai_interactions INTEGER DEFAULT 0,
  learning_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own daily stats"
  ON public.daily_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily stats"
  ON public.daily_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily stats"
  ON public.daily_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to track daily stats
CREATE OR REPLACE FUNCTION public.increment_daily_stat(
  p_user_id UUID,
  p_stat_type TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.daily_stats (user_id, date, tasks_completed, videos_watched, materials_read, ai_interactions)
  VALUES (
    p_user_id,
    CURRENT_DATE,
    CASE WHEN p_stat_type = 'tasks' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'videos' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'materials' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'ai' THEN p_increment ELSE 0 END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    tasks_completed = CASE WHEN p_stat_type = 'tasks' THEN daily_stats.tasks_completed + p_increment ELSE daily_stats.tasks_completed END,
    videos_watched = CASE WHEN p_stat_type = 'videos' THEN daily_stats.videos_watched + p_increment ELSE daily_stats.videos_watched END,
    materials_read = CASE WHEN p_stat_type = 'materials' THEN daily_stats.materials_read + p_increment ELSE daily_stats.materials_read END,
    ai_interactions = CASE WHEN p_stat_type = 'ai' THEN daily_stats.ai_interactions + p_increment ELSE daily_stats.ai_interactions END;
END;
$$;