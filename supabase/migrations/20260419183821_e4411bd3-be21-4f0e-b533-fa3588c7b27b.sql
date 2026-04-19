-- Add time limit to admin quizzes
ALTER TABLE public.admin_quizzes 
ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT 30;

-- Enable realtime for live updates
ALTER TABLE public.daily_stats REPLICA IDENTITY FULL;
ALTER TABLE public.user_rankings REPLICA IDENTITY FULL;
ALTER TABLE public.admin_quizzes REPLICA IDENTITY FULL;
ALTER TABLE public.worksheets REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_stats;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_rankings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_quizzes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.worksheets;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;