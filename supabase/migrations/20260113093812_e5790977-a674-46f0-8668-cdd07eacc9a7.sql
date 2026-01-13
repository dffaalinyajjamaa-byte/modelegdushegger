-- Fix the update_badge_tier function with proper search_path
CREATE OR REPLACE FUNCTION public.update_badge_tier()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;