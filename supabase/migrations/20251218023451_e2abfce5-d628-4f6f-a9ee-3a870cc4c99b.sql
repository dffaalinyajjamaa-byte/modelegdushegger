-- Create trigger to initialize user_stats and user_rankings when a new profile is created
CREATE OR REPLACE FUNCTION public.initialize_user_stats_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Initialize user_stats
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize user_rankings
  INSERT INTO public.user_rankings (user_id, total_points, current_streak, longest_streak, last_activity_date)
  VALUES (NEW.user_id, 0, 0, 0, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_stats_on_profile();