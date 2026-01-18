-- Create app_role enum type
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');

-- Create user_roles table (following security best practices)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create teacher_codes table for single-use verification codes
CREATE TABLE public.teacher_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on teacher_codes
ALTER TABLE public.teacher_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for teacher_codes
CREATE POLICY "Anyone can check if code exists"
ON public.teacher_codes
FOR SELECT
USING (true);

CREATE POLICY "Users can claim unused codes"
ON public.teacher_codes
FOR UPDATE
USING (used_by IS NULL)
WITH CHECK (auth.uid() = used_by);

-- Create teacher_uploads table with realtime support
CREATE TABLE public.teacher_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  teacher_name TEXT NOT NULL,
  school TEXT,
  type TEXT NOT NULL CHECK (type IN ('quiz', 'worksheet', 'announcement', 'video')),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  content_data JSONB,
  grade_level TEXT,
  subject TEXT,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on teacher_uploads
ALTER TABLE public.teacher_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for teacher_uploads
CREATE POLICY "Everyone can view uploads"
ON public.teacher_uploads
FOR SELECT
USING (true);

CREATE POLICY "Teachers can create uploads"
ON public.teacher_uploads
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'teacher') AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own uploads"
ON public.teacher_uploads
FOR UPDATE
USING (public.has_role(auth.uid(), 'teacher') AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own uploads"
ON public.teacher_uploads
FOR DELETE
USING (public.has_role(auth.uid(), 'teacher') AND auth.uid() = teacher_id);

-- Enable realtime for teacher_uploads
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_uploads;

-- Insert 100 teacher codes
INSERT INTO public.teacher_codes (code) VALUES
('MODEL-A1B2'), ('MODEL-A1B3'), ('MODEL-A1B4'), ('MODEL-A1B5'), ('MODEL-A1B6'),
('MODEL-A1B7'), ('MODEL-A1B8'), ('MODEL-A1B9'), ('MODEL-A1C0'), ('MODEL-A1C1'),
('MODEL-B2A1'), ('MODEL-B2A2'), ('MODEL-B2A3'), ('MODEL-B2A4'), ('MODEL-B2A5'),
('MODEL-B2A6'), ('MODEL-B2A7'), ('MODEL-B2A8'), ('MODEL-B2A9'), ('MODEL-B2B0'),
('MODEL-C3D1'), ('MODEL-C3D2'), ('MODEL-C3D3'), ('MODEL-C3D4'), ('MODEL-C3D5'),
('MODEL-C3D6'), ('MODEL-C3D7'), ('MODEL-C3D8'), ('MODEL-C3D9'), ('MODEL-C3E0'),
('MODEL-D4E1'), ('MODEL-D4E2'), ('MODEL-D4E3'), ('MODEL-D4E4'), ('MODEL-D4E5'),
('MODEL-D4E6'), ('MODEL-D4E7'), ('MODEL-D4E8'), ('MODEL-D4E9'), ('MODEL-D4F0'),
('MODEL-E5F1'), ('MODEL-E5F2'), ('MODEL-E5F3'), ('MODEL-E5F4'), ('MODEL-E5F5'),
('MODEL-E5F6'), ('MODEL-E5F7'), ('MODEL-E5F8'), ('MODEL-E5F9'), ('MODEL-E5G0'),
('MODEL-F6G1'), ('MODEL-F6G2'), ('MODEL-F6G3'), ('MODEL-F6G4'), ('MODEL-F6G5'),
('MODEL-F6G6'), ('MODEL-F6G7'), ('MODEL-F6G8'), ('MODEL-F6G9'), ('MODEL-F6H0'),
('MODEL-G7H1'), ('MODEL-G7H2'), ('MODEL-G7H3'), ('MODEL-G7H4'), ('MODEL-G7H5'),
('MODEL-G7H6'), ('MODEL-G7H7'), ('MODEL-G7H8'), ('MODEL-G7H9'), ('MODEL-G7I0'),
('MODEL-H8I1'), ('MODEL-H8I2'), ('MODEL-H8I3'), ('MODEL-H8I4'), ('MODEL-H8I5'),
('MODEL-H8I6'), ('MODEL-H8I7'), ('MODEL-H8I8'), ('MODEL-H8I9'), ('MODEL-H8J0'),
('MODEL-I9J1'), ('MODEL-I9J2'), ('MODEL-I9J3'), ('MODEL-I9J4'), ('MODEL-I9J5'),
('MODEL-I9J6'), ('MODEL-I9J7'), ('MODEL-I9J8'), ('MODEL-I9J9'), ('MODEL-I9K0'),
('MODEL-J0K1'), ('MODEL-J0K2'), ('MODEL-J0K3'), ('MODEL-J0K4'), ('MODEL-J0K5'),
('MODEL-J0K6'), ('MODEL-J0K7'), ('MODEL-J0K8'), ('MODEL-J0K9'), ('MODEL-J0L0');