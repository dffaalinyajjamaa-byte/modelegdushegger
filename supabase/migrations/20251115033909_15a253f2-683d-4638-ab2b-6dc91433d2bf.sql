-- Create activity log table for tracking user learning activities
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  subject TEXT,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own activity log"
ON public.user_activity_log
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log"
ON public.user_activity_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity log"
ON public.user_activity_log
FOR UPDATE
USING (auth.uid() = user_id);

-- Index for fast queries
CREATE INDEX idx_user_activity_user_created 
ON public.user_activity_log(user_id, created_at DESC);

-- Index for subject queries
CREATE INDEX idx_user_activity_subject 
ON public.user_activity_log(user_id, subject);