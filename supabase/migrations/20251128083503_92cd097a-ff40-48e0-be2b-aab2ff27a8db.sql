-- Create national_exams table
CREATE TABLE IF NOT EXISTS public.national_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  year INTEGER NOT NULL,
  pdf_url TEXT NOT NULL,
  cover_image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create daily_challenges table
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  content_data JSONB,
  points INTEGER DEFAULT 10,
  active_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.national_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for national_exams (public read access)
CREATE POLICY "National exams are viewable by authenticated users"
ON public.national_exams
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for daily_challenges (public read access)
CREATE POLICY "Daily challenges are viewable by authenticated users"
ON public.daily_challenges
FOR SELECT
TO authenticated
USING (true);

-- Create user_challenge_progress table
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenge progress"
ON public.user_challenge_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge progress"
ON public.user_challenge_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge progress"
ON public.user_challenge_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Seed national exam PDFs
INSERT INTO public.national_exams (title, subject, year, pdf_url, description) VALUES
('National Exam - English', 'Afaan Ingiliffaa', 2017, 'https://drive.google.com/file/d/1u0jZSkgB0tED0uXyXpA_-fmCm6mGIbn4/view?usp=drivesdk', 'Grade 8 National Examination - English Language'),
('National Exam - Afaan Oromoo', 'Afaan Oromoo', 2017, 'https://drive.google.com/file/d/1ezFlWJNPN3fD2Iy_12pEEKhz8LsW-f5y/view?usp=drivesdk', 'Grade 8 National Examination - Oromo Language'),
('National Exam - Social Studies', 'Hawaasa', 2017, 'https://drive.google.com/file/d/14gOMxPATXh32sTKAEJIrBuO9rQK0aK4_/view?usp=drivesdk', 'Grade 8 National Examination - Social Studies 2017'),
('National Exam - Social Studies', 'Hawaasa', 2016, 'https://drive.google.com/file/d/1UruOI3z_m97M4yH2juMuRFkb8-Lxi4ih/view?usp=drivesdk', 'Grade 8 National Examination - Social Studies 2016'),
('National Exam - Science', 'Saayinsii Waliigalaa', 2017, 'https://drive.google.com/file/d/1oEUHQHnkrLtSC1mxpahZ1yZLUMNJAFAm/view?usp=drivesdk', 'Grade 8 National Examination - General Science 2017'),
('National Exam - Science', 'Saayinsii Waliigalaa', 2016, 'https://drive.google.com/file/d/1rhN47y5f-c6cQ-pMH1NwKRoTRJfaR7Kn/view?usp=drivesdk', 'Grade 8 National Examination - General Science 2016'),
('National Exam - Mathematics', 'Herrega', 2017, 'https://drive.google.com/file/d/1GVOhWBnEsUcTE2YmBdEuAY7TXzHny4be/view?usp=drivesdk', 'Grade 8 National Examination - Mathematics'),
('National Exam - Civics', 'Lammummaa', 2017, 'https://drive.google.com/file/d/1ZWevvRRdbOvyDcJ0b7GDXEqIQ8jcES1T/view?usp=drivesdk', 'Grade 8 National Examination - Civics and Ethical Education');