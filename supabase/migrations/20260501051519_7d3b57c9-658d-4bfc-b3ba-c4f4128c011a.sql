CREATE OR REPLACE FUNCTION public.increment_daily_stat(p_user_id uuid, p_stat_type text, p_increment integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.daily_stats (user_id, date, tasks_completed, videos_watched, materials_read, ai_interactions, exams_taken, learning_time_minutes)
  VALUES (
    p_user_id,
    CURRENT_DATE,
    CASE WHEN p_stat_type = 'tasks' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'videos' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'materials' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'ai' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'exams' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'learning_minutes' THEN p_increment ELSE 0 END
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    tasks_completed       = daily_stats.tasks_completed       + CASE WHEN p_stat_type='tasks'             THEN p_increment ELSE 0 END,
    videos_watched        = daily_stats.videos_watched        + CASE WHEN p_stat_type='videos'            THEN p_increment ELSE 0 END,
    materials_read        = daily_stats.materials_read        + CASE WHEN p_stat_type='materials'         THEN p_increment ELSE 0 END,
    ai_interactions       = daily_stats.ai_interactions       + CASE WHEN p_stat_type='ai'                THEN p_increment ELSE 0 END,
    exams_taken           = daily_stats.exams_taken           + CASE WHEN p_stat_type='exams'             THEN p_increment ELSE 0 END,
    learning_time_minutes = daily_stats.learning_time_minutes + CASE WHEN p_stat_type='learning_minutes'  THEN p_increment ELSE 0 END;
END;
$function$;