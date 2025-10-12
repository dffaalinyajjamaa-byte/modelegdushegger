-- AI Study Coach Tables
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  mood TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own study sessions"
ON public.study_sessions
FOR ALL
USING (auth.uid() = user_id);

-- Study Streak Tracking
CREATE TABLE public.study_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE,
  total_study_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own study streaks"
ON public.study_streaks
FOR ALL
USING (auth.uid() = user_id);

-- Daily Tips and Recommendations
CREATE TABLE public.daily_study_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tip_content TEXT NOT NULL,
  tip_type TEXT NOT NULL, -- 'motivation', 'subject_recommendation', 'quiz_suggestion'
  subject TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_study_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own study tips"
ON public.daily_study_tips
FOR ALL
USING (auth.uid() = user_id);

-- Mood-Based Study Preferences
CREATE TABLE public.study_mood_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_mood TEXT NOT NULL DEFAULT 'focused', -- 'focused', 'relaxed', 'energetic'
  theme_preference TEXT,
  animation_speed TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_mood_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own mood preferences"
ON public.study_mood_preferences
FOR ALL
USING (auth.uid() = user_id);

-- Interactive Mind Maps
CREATE TABLE public.mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  is_collaborative BOOLEAN NOT NULL DEFAULT false,
  collaborators UUID[],
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own mind maps"
ON public.mind_maps
FOR ALL
USING (auth.uid() = user_id OR auth.uid() = ANY(collaborators));

-- Mind Map Nodes (detailed notes)
CREATE TABLE public.mind_map_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mind_map_id UUID NOT NULL REFERENCES public.mind_maps(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mind_map_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes in their mind maps"
ON public.mind_map_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mind_maps
    WHERE mind_maps.id = mind_map_notes.mind_map_id
    AND (mind_maps.user_id = auth.uid() OR auth.uid() = ANY(mind_maps.collaborators))
  )
);

CREATE POLICY "Users can create notes in their mind maps"
ON public.mind_map_notes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mind_maps
    WHERE mind_maps.id = mind_map_notes.mind_map_id
    AND (mind_maps.user_id = auth.uid() OR auth.uid() = ANY(mind_maps.collaborators))
  )
  AND auth.uid() = created_by
);

-- Indexes for performance
CREATE INDEX idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX idx_study_sessions_completed_at ON public.study_sessions(completed_at);
CREATE INDEX idx_daily_study_tips_user_id ON public.daily_study_tips(user_id);
CREATE INDEX idx_daily_study_tips_created_at ON public.daily_study_tips(created_at);
CREATE INDEX idx_mind_maps_user_id ON public.mind_maps(user_id);
CREATE INDEX idx_mind_maps_collaborators ON public.mind_maps USING GIN(collaborators);

-- Trigger for updating updated_at
CREATE TRIGGER update_study_streaks_updated_at
BEFORE UPDATE ON public.study_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_mood_preferences_updated_at
BEFORE UPDATE ON public.study_mood_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mind_maps_updated_at
BEFORE UPDATE ON public.mind_maps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();