-- Admin-created quizzes table
CREATE TABLE public.admin_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view admin quizzes"
  ON public.admin_quizzes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert admin quizzes"
  ON public.admin_quizzes FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update admin quizzes"
  ON public.admin_quizzes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete admin quizzes"
  ON public.admin_quizzes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all reported messages
CREATE POLICY "Admins can view all reports"
  ON public.reported_messages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update report status
CREATE POLICY "Admins can update reports"
  ON public.reported_messages FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));