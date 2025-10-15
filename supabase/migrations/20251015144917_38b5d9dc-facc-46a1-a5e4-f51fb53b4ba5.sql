-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'teacher', 'student');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
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

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert admin role for the specified email
-- Note: This will work after the user signs up with this email
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Try to find user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'milonmax146@gmail.com'
  LIMIT 1;
  
  -- Only insert if user exists
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Create admin_users view for easy admin checking
CREATE OR REPLACE VIEW public.admin_users AS
SELECT 
  p.id,
  p.user_id,
  p.full_name,
  p.email,
  ur.role,
  p.avatar_url,
  p.created_at
FROM public.profiles p
INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.role IN ('admin', 'moderator');

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Update profiles RLS to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Update content RLS to use new role system
DROP POLICY IF EXISTS "Admins can manage content" ON public.content;
CREATE POLICY "Admins can manage content"
  ON public.content
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Add analytics table for admin dashboard
CREATE TABLE public.app_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.app_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage analytics"
  ON public.app_analytics
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Add announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  target_audience TEXT[] DEFAULT ARRAY['student'],
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active announcements"
  ON public.announcements
  FOR SELECT
  USING (expires_at IS NULL OR expires_at > now());

CREATE POLICY "Admins can manage announcements"
  ON public.announcements
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));