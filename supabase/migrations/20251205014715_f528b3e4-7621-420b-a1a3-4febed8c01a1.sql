-- Add new profile fields for registration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS school_name TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS favorite_subject TEXT,
ADD COLUMN IF NOT EXISTS goal TEXT;

-- Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on typing_indicators
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Create policies for typing_indicators
CREATE POLICY "Users can view typing status in their chats"
ON public.typing_indicators
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.chat_id = typing_indicators.chat_id
    AND (auth.uid())::text = ANY(chats.members)
  )
);

CREATE POLICY "Users can update their own typing status"
ON public.typing_indicators
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create unique constraint for chat_id and user_id
ALTER TABLE public.typing_indicators 
ADD CONSTRAINT unique_typing_per_user_chat UNIQUE (chat_id, user_id);

-- Enable realtime for typing_indicators
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;