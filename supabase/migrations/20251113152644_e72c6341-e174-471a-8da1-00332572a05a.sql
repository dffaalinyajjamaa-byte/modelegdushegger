-- Fix search_path for the function - drop cascade and recreate
DROP FUNCTION IF EXISTS public.update_book_progress_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_book_progress_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_book_progress_timestamp
  BEFORE UPDATE ON public.book_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_book_progress_updated_at();