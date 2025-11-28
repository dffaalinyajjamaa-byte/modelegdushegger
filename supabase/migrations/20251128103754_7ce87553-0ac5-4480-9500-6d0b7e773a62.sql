-- Create live_teacher_settings table for user preferences
CREATE TABLE IF NOT EXISTS public.live_teacher_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_id TEXT DEFAULT 'pNInz6obpgDQGcFmaJgB',
  speech_speed DECIMAL DEFAULT 1.0,
  language_preference TEXT DEFAULT 'oromo',
  continuous_listening BOOLEAN DEFAULT false,
  auto_speak_responses BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.live_teacher_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own settings"
  ON public.live_teacher_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.live_teacher_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.live_teacher_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_live_teacher_settings_updated_at
  BEFORE UPDATE ON public.live_teacher_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();