-- Create friend_requests table for messenger friend system
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests (sent or received)
CREATE POLICY "Users can view their own friend requests"
ON public.friend_requests FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
ON public.friend_requests FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can update requests they received
CREATE POLICY "Users can update friend requests they received"
ON public.friend_requests FOR UPDATE
USING (auth.uid() = receiver_id);

-- Users can delete their own requests
CREATE POLICY "Users can delete their friend requests"
ON public.friend_requests FOR DELETE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Create trigger for updated_at
CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for friend_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;

-- Add teacher_points column to user_rankings if not exists
ALTER TABLE public.user_rankings ADD COLUMN IF NOT EXISTS teacher_points INTEGER DEFAULT 0;
ALTER TABLE public.user_rankings ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;

-- Function to award teacher points on upload
CREATE OR REPLACE FUNCTION public.award_teacher_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_rankings
  SET teacher_points = teacher_points + 15,
      posts_count = posts_count + 1,
      updated_at = NOW()
  WHERE user_id = NEW.teacher_id;
  
  -- Insert if not exists
  IF NOT FOUND THEN
    INSERT INTO user_rankings (user_id, teacher_points, posts_count, total_points)
    VALUES (NEW.teacher_id, 15, 1, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET teacher_points = user_rankings.teacher_points + 15,
        posts_count = user_rankings.posts_count + 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for teacher points
DROP TRIGGER IF EXISTS award_teacher_points_trigger ON public.teacher_uploads;
CREATE TRIGGER award_teacher_points_trigger
AFTER INSERT ON public.teacher_uploads
FOR EACH ROW
EXECUTE FUNCTION public.award_teacher_points();