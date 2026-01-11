-- Create smart_planner_settings table for user's weekly schedule
CREATE TABLE public.smart_planner_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  school_start TIME,
  school_end TIME,
  rest_start TIME,
  rest_end TIME,
  dinner_start TIME,
  dinner_end TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

-- Create smart_planner_subjects table for user's selected subjects
CREATE TABLE public.smart_planner_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject)
);

-- Create smart_planner_plans table to store generated weekly plans
CREATE TABLE public.smart_planner_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_index INTEGER NOT NULL,
  year INTEGER NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_index, year)
);

-- Enable RLS on all tables
ALTER TABLE public.smart_planner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_planner_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_planner_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for smart_planner_settings
CREATE POLICY "Users can view own settings" ON public.smart_planner_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings" ON public.smart_planner_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.smart_planner_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON public.smart_planner_settings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for smart_planner_subjects
CREATE POLICY "Users can view own subjects" ON public.smart_planner_subjects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subjects" ON public.smart_planner_subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON public.smart_planner_subjects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON public.smart_planner_subjects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for smart_planner_plans
CREATE POLICY "Users can view own plans" ON public.smart_planner_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own plans" ON public.smart_planner_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans" ON public.smart_planner_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans" ON public.smart_planner_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on smart_planner_settings
CREATE TRIGGER update_smart_planner_settings_updated_at
  BEFORE UPDATE ON public.smart_planner_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();